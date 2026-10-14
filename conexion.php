<?php
/* ==================== CONEXIÓN A LA BASE DE DATOS ==================== */
/* Cambia estos datos por los de tu servidor (XAMPP: usuario root, sin contraseña) */
$DB_HOST = 'localhost';
$DB_NAME = 'raven_store';
$DB_USER = 'root';
$DB_PASS = '';
$DB_CHARSET = 'utf8mb4';

/* Contraseña del panel de administrador (la usan listar.php, eliminar.php y actualizar.php). CÁMBIALA. */
$ADMIN_CLAVE = 'raven777';

try {
    $pdo = new PDO(
        "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=$DB_CHARSET",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,   // lanza errores
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,         // resultados como arreglo
            PDO::ATTR_EMULATE_PREPARES   => false                     // consultas preparadas reales
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    // No mostramos detalles al visitante; revisa el log del servidor
    error_log('Error de conexión: ' . $e->getMessage());
    exit('No se pudo conectar a la base de datos.');
}

/* ==================== USO ====================
   En otro archivo PHP:

   require 'conexion.php';
   $stmt = $pdo->prepare('SELECT * FROM productos WHERE stock > ?');
   $stmt->execute([0]);
   $productos = $stmt->fetchAll();
*/
