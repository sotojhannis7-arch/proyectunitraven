<?php
/* ==================== ELIMINAR RESERVA ====================
   Borra una reserva y sus prendas (reserva_items se borra sola por ON DELETE CASCADE).

   Se envía por POST en JSON:  { "clave": "...", "id": 12 }
   Usa la MISMA clave que listar.php.
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

$id = filter_var($d['id'] ?? null, FILTER_VALIDATE_INT);
if ($id === false || $id < 1) {
    responder(422, ['ok' => false, 'error' => 'ID inválido.']);
}

try {
    $stmt = $pdo->prepare('DELETE FROM reservas WHERE id = ?');
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) {
        responder(404, ['ok' => false, 'error' => 'La reserva no existe.']);
    }

    responder(200, ['ok' => true, 'eliminada' => $id]);

} catch (PDOException $e) {
    error_log('Error al eliminar reserva: ' . $e->getMessage());
    responder(500, ['ok' => false, 'error' => 'No se pudo eliminar la reserva.']);
}
