<?php
/* ==================== LISTAR RESERVAS ====================
   Devuelve las reservas (con sus prendas) en JSON para el panel de administrador.

   Como incluye nombres y celulares de clientes, está protegido con una clave.
   Se envía por POST en JSON:  { "clave": "...", "estado": "Pendiente" }   (estado es opcional)
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
    usleep(500000); // frena intentos de adivinar la clave
    responder(401, ['ok' => false, 'error' => 'Clave incorrecta.']);
}

$estado = trim((string)($d['estado'] ?? ''));

try {
    /* ---------- Reservas (más recientes primero) ---------- */
    if ($estado !== '') {
        $stmt = $pdo->prepare('SELECT * FROM reservas WHERE estado = ? ORDER BY id DESC');
        $stmt->execute([$estado]);
    } else {
        $stmt = $pdo->query('SELECT * FROM reservas ORDER BY id DESC');
    }
    $reservas = $stmt->fetchAll();

    /* ---------- Prendas de todas esas reservas, en una sola consulta ---------- */
    $porReserva = [];
    if ($reservas) {
        $ids = array_column($reservas, 'id');
        $marcas = implode(',', array_fill(0, count($ids), '?'));
        $stmtItems = $pdo->prepare(
            "SELECT reserva_id, producto, talla, cantidad, precio
             FROM reserva_items WHERE reserva_id IN ($marcas)"
        );
        $stmtItems->execute($ids);
        foreach ($stmtItems->fetchAll() as $it) {
            $porReserva[$it['reserva_id']][] = [
                'nombre' => $it['producto'],
                'talla'  => $it['talla'],
                'cant'   => (int)$it['cantidad'],
                'precio' => (float)$it['precio']
            ];
        }
    }

    /* ---------- Misma forma que usa tu script.js ---------- */
    $salida = array_map(function ($r) use ($porReserva) {
        return [
            'id'       => (int)$r['id'],
            'fecha'    => $r['fecha'],
            'cliente'  => $r['cliente'],
            'telefono' => $r['telefono'],
            'estado'   => $r['estado'],
            'total'    => (float)$r['total'],
            'lugar'    => $r['lugar'],
            'entrega'  => $r['entrega'],
            'items'    => $porReserva[$r['id']] ?? []
        ];
    }, $reservas);

    responder(200, ['ok' => true, 'cantidad' => count($salida), 'reservas' => $salida]);

} catch (PDOException $e) {
    error_log('Error al listar reservas: ' . $e->getMessage());
    responder(500, ['ok' => false, 'error' => 'No se pudieron leer las reservas.']);
}
