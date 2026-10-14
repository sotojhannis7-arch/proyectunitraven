<?php
/* ==================== ACTUALIZAR ESTADO DE UNA RESERVA ====================
   Se envía por POST en JSON:  { "clave": "...", "id": 12, "estado": "Confirmada" }
   La clave ($ADMIN_CLAVE) se define en conexion.php.
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

if (!hash_equals($ADMIN_CLAVE, (string)($d['clave'] ?? ''))) {
    usleep(500000);
    responder(401, ['ok' => false, 'error' => 'Clave incorrecta.']);
}

$id = filter_var($d['id'] ?? null, FILTER_VALIDATE_INT);
if ($id === false || $id < 1) {
    responder(422, ['ok' => false, 'error' => 'ID inválido.']);
}

$estado = (string)($d['estado'] ?? '');
if (!in_array($estado, ['Pendiente', 'Confirmada', 'Entregada', 'Cancelada'], true)) {
    responder(422, ['ok' => false, 'error' => 'Estado inválido.']);
}

try {
    $stmt = $pdo->prepare('UPDATE reservas SET estado = ? WHERE id = ?');
    $stmt->execute([$estado, $id]);

    // rowCount() es 0 si el estado ya era el mismo, así que comprobamos que la reserva exista
    $existe = $pdo->prepare('SELECT COUNT(*) FROM reservas WHERE id = ?');
    $existe->execute([$id]);
    if ((int)$existe->fetchColumn() === 0) {
        responder(404, ['ok' => false, 'error' => 'La reserva no existe.']);
    }

    responder(200, ['ok' => true, 'id' => $id, 'estado' => $estado]);

} catch (PDOException $e) {
    error_log('Error al actualizar reserva: ' . $e->getMessage());
    responder(500, ['ok' => false, 'error' => 'No se pudo actualizar la reserva.']);
}
