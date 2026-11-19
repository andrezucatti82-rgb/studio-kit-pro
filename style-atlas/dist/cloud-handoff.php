<?php
declare(strict_types=1);

// Receives and serves encrypted packages. Keys stay in the browser and the agent's prompt.
const FOLIO_ORIGIN = 'https://videos.gerenciadordeanuncios.com.br';
const FOLIO_LIMIT = 64 * 1024 * 1024;
const FOLIO_TTL = 7200;

ini_set('display_errors', '0');
header('Cache-Control: private, no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Robots-Tag: noindex, nofollow');

function result(int $status, array $data): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host = $_SERVER['HTTP_HOST'] ?? '';
$local = PHP_SAPI === 'cli-server' && preg_match('/^(localhost|127\.0\.0\.1):[0-9]+$/D', $host);
if ($method !== 'GET' && $method !== 'PUT') result(405, ['error' => 'Método indisponível.']);
if ($method === 'PUT' && $origin !== ($local ? 'http://' . $host : FOLIO_ORIGIN)) {
    result(403, ['error' => 'Envie pelo próprio Fólio.']);
}

$folder = sys_get_temp_dir() . '/folio-handoff-' . hash('sha256', __DIR__);
if (!is_dir($folder)) @mkdir($folder, 0700);
if (!is_dir($folder) || is_link($folder) || !is_writable($folder)) result(503, ['error' => 'Envio temporariamente indisponível.']);
$clock = time();
$lock = fopen($folder . '/quota.lock', 'c');
if (!$lock || !flock($lock, LOCK_EX)) result(503, ['error' => 'Envio temporariamente indisponível.']);

$client = hash('sha256', __DIR__ . ':client:' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
$active = 0;
$perClient = 0;
foreach (glob($folder . '/*.meta') ?: [] as $metadataFile) {
    $meta = json_decode((string) file_get_contents($metadataFile), true);
    if (!is_array($meta) || ($meta['expiresAt'] ?? 0) <= $clock) {
        @unlink(substr($metadataFile, 0, -5) . '.bin');
        @unlink($metadataFile);
        continue;
    }
    ++$active;
    if (($meta['client'] ?? '') === $client) ++$perClient;
}

if ($method === 'GET') {
    $id = $_GET['id'] ?? null;
    if (!is_string($id) || !preg_match('/^[a-f0-9]{48}$/D', $id)) result(404, ['error' => 'Pacote indisponível.']);
    $name = $folder . '/' . $id;
    $data = is_file($name . '.meta') ? json_decode((string) file_get_contents($name . '.meta'), true) : null;
    $stream = is_array($data) && ($data['ready'] ?? false) ? @fopen($name . '.bin', 'rb') : false;
    flock($lock, LOCK_UN);
    if (!$stream) result(404, ['error' => 'Pacote indisponível ou expirado.']);
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="folio-producao.enc"');
    header('Content-Length: ' . fstat($stream)['size']);
    fpassthru($stream);
    fclose($stream);
    exit;
}

$length = filter_var($_SERVER['CONTENT_LENGTH'] ?? '', FILTER_VALIDATE_INT);
if (strtolower($_SERVER['CONTENT_TYPE'] ?? '') !== 'application/octet-stream' || $length === false || $length < 33) {
    result(400, ['error' => 'Pacote inválido.']);
}
if ($length > FOLIO_LIMIT) result(413, ['error' => 'O pacote excede 64 MB.']);
if ($active >= 24 || $perClient >= 5) result(429, ['error' => 'Limite de envios temporários atingido.']);

$id = bin2hex(random_bytes(24));
$name = $folder . '/' . $id;
$meta = ['client' => $client, 'expiresAt' => $clock + FOLIO_TTL, 'ready' => false];
$metaFile = fopen($name . '.meta', 'x');
if (!$metaFile) result(503, ['error' => 'Envio temporariamente indisponível.']);
fwrite($metaFile, json_encode($meta, JSON_THROW_ON_ERROR));
fclose($metaFile);
flock($lock, LOCK_UN);

$source = fopen('php://input', 'rb');
$destination = @fopen($name . '.bin', 'xb');
$copied = $source && $destination ? stream_copy_to_stream($source, $destination, $length + 1) : false;
if ($source) fclose($source);
if ($destination) fclose($destination);
flock($lock, LOCK_EX);
if ($copied !== $length || !is_file($name . '.meta') || time() >= $meta['expiresAt']) {
    @unlink($name . '.bin');
    @unlink($name . '.meta');
    result(400, ['error' => 'O envio foi interrompido. Tente novamente.']);
}
$meta['ready'] = true;
if (!file_put_contents($name . '.meta', json_encode($meta, JSON_THROW_ON_ERROR))) {
    @unlink($name . '.bin');
    @unlink($name . '.meta');
    result(503, ['error' => 'Envio temporariamente indisponível.']);
}
flock($lock, LOCK_UN);
result(201, ['id' => $id, 'expiresAt' => $meta['expiresAt']]);
