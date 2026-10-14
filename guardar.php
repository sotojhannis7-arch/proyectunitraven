<?php
/* ==================== GUARDAR RESERVA ====================
   Recibe una reserva en JSON (POST) y la guarda en MySQL.

   Tablas necesarias (ejecútalo una vez en phpMyAdmin):

   CREATE TABLE reservas (
     id         INT AUTO_INCREMENT PRIMARY KEY,
     fecha      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     cliente    VARCHAR(40)  NOT NULL,
     telefono   VARCHAR(8)   NOT NULL,
     lugar      VARCHAR(100) NOT NULL,
     entrega    VARCHAR(20)  NOT NULL,
     total      DECIMAL(10,2) NOT NULL,
     estado     VARCHAR(20)  NOT NULL DEFAULT 'Pendiente'
   ) CHARACTER SET utf8mb4;

   CREATE TABLE reserva_items (
     id         INT AUTO_INCREMENT PRIMARY KEY,
     reserva_id INT NOT NULL,
     producto   VARCHAR(100) NOT NULL,
     talla      VARCHAR(10),
     cantidad   INT NOT NULL,
     precio     DECIMAL(10,2) NOT NULL,
     FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE CASCADE
   ) CHARACTER SET utf8mb4;
*/

require 'conexion.php';
header('Content-Type: application/json; charset=utf-8');

function responder(int $codigo, array $datos): void {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, ['ok' => false, 'error' => 'Método no permitido.']);
}

$d = json_decode(file_get_contents('php://input'), true);
if (!is_array($d)) {
    responder(400, ['ok' => false, 'error' => 'Datos inválidos.']);
}

/* ---------- Validación (el servidor nunca debe confiar solo en el navegador) ---------- */
$cliente  = trim((string)($d['cliente']  ?? ''));
$telefono = trim((string)($d['telefono'] ?? ''));
$lugar    = trim((string)($d['lugar']    ?? ''));
$entrega  = trim((string)($d['entrega']  ?? ''));
$items    = $d['items'] ?? [];

if (mb_strlen($cliente) < 2 || mb_strlen($cliente) > 40) {
    responder(422, ['ok' => false, 'error' => 'Nombre inválido.']);
}
if (!preg_match('/^\d{7,8}$/', $telefono)) {
    responder(422, ['ok' => false, 'error' => 'El celular debe tener 7 u 8 números.']);
}
if ($lugar === '' || mb_strlen($lugar) > 100) {
    responder(422, ['ok' => false, 'error' => 'Lugar de entrega inválido.']);
}
if (!preg_match('#^\d{2}/\d{2}/\d{4} \d{2}:\d{2}$#', $entrega)) {
    responder(422, ['ok' => false, 'error' => 'Fecha de entrega inválida.']);
}
if (!is_array($items) || count($items) === 0 || count($items) > 50) {
    responder(422, ['ok' => false, 'error' => 'La reserva está vacía.']);
}

$total = 0;
$limpios = [];
foreach ($items as $it) {
    $nombre   = trim((string)($it['nombre'] ?? ''));
    $talla    = trim((string)($it['talla']  ?? ''));
    $cantidad = (int)($it['cant']   ?? 0);
    $precio   = (float)($it['precio'] ?? 0);
    if ($nombre === '' || $cantidad < 1 || $cantidad > 99 || $precio <= 0) {
        responder(422, ['ok' => false, 'error' => 'Prenda inválida en la reserva.']);
    }
    $total += $cantidad * $precio;
    $limpios[] = [$nombre, $talla, $cantidad, $precio];
}

/* ---------- Guardado (todo o nada) ---------- */
try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare(
        'INSERT INTO reservas (cliente, telefono, lugar, entrega, total) VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([$cliente, $telefono, $lugar, $entrega, $total]);
    $reservaId = (int)$pdo->lastInsertId();

    $stmtItem = $pdo->prepare(
        'INSERT INTO reserva_items (reserva_id, producto, talla, cantidad, precio) VALUES (?, ?, ?, ?, ?)'
    );
    foreach ($limpios as [$nombre, $talla, $cantidad, $precio]) {
        $stmtItem->execute([$reservaId, $nombre, $talla, $cantidad, $precio]);
    }

    $pdo->commit();
    responder(201, ['ok' => true, 'id' => $reservaId, 'total' => $total]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('Error al guardar reserva: ' . $e->getMessage());
    responder(500, ['ok' => false, 'error' => 'No se pudo guardar la reserva.']);
}
