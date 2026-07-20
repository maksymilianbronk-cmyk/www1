<?php
/**
 * Store — prosty magazyn danych oparty o pliki JSON z blokadą zapisu.
 * Wszystkie dane panelu (konfiguracja, tokeny, hurtownie, produkty, logi)
 * trzymane są w katalogu data/ zablokowanym przez .htaccess.
 */
class Store
{
    private $dir;

    public function __construct(string $dir)
    {
        $this->dir = rtrim($dir, '/');
        if (!is_dir($this->dir)) {
            mkdir($this->dir, 0770, true);
        }
        // Zapasowa blokada dostępu, gdyby .htaccess nie trafił na serwer
        $ht = $this->dir . '/.htaccess';
        if (!file_exists($ht)) {
            @file_put_contents($ht, "Require all denied\n");
        }
    }

    private function path(string $name): string
    {
        $safe = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $name);
        return $this->dir . '/' . $safe . '.json';
    }

    public function read(string $name, $default = null)
    {
        $path = $this->path($name);
        if (!file_exists($path)) {
            return $default;
        }
        $raw = file_get_contents($path);
        if ($raw === false || $raw === '') {
            return $default;
        }
        $data = json_decode($raw, true);
        return $data === null && $raw !== 'null' ? $default : $data;
    }

    public function write(string $name, $data): bool
    {
        $path = $this->path($name);
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $fp = fopen($path, 'c');
        if ($fp === false) {
            return false;
        }
        $ok = false;
        if (flock($fp, LOCK_EX)) {
            ftruncate($fp, 0);
            $ok = fwrite($fp, $json) !== false;
            fflush($fp);
            flock($fp, LOCK_UN);
        }
        fclose($fp);
        @chmod($path, 0660);
        return $ok;
    }

    public function delete(string $name): void
    {
        $path = $this->path($name);
        if (file_exists($path)) {
            unlink($path);
        }
    }

    /** Dopisuje wpis do logu (utrzymuje maks. 500 ostatnich wpisów). */
    public function log(string $level, string $msg, array $ctx = []): void
    {
        $logs = $this->read('logs', []);
        $logs[] = [
            'ts'    => date('Y-m-d H:i:s'),
            'level' => $level,
            'msg'   => $msg,
            'ctx'   => $ctx,
        ];
        if (count($logs) > 500) {
            $logs = array_slice($logs, -500);
        }
        $this->write('logs', $logs);
    }

    public function tmpFile(string $prefix): string
    {
        return $this->dir . '/' . preg_replace('/[^a-zA-Z0-9_\-]/', '_', $prefix) . '.tmp';
    }
}
