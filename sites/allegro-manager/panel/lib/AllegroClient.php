<?php
/**
 * AllegroClient — klient Allegro REST API.
 *
 * Obsługuje:
 *  - autoryzację OAuth 2.0 Authorization Code (przekierowanie do Allegro,
 *    dokładnie tak jak robi to SkyShop / BaseLinker),
 *  - autoryzację Device Flow (kod wpisywany na allegro.pl/skojarz-aplikacje —
 *    przydatna, gdy panel działa na localhost bez publicznego adresu),
 *  - automatyczne odświeżanie tokenu (refresh_token),
 *  - środowisko produkcyjne i Sandbox (allegro.pl.allegrosandbox.pl),
 *  - wywołania REST API z nagłówkami application/vnd.allegro.public.v1+json.
 */
class AllegroClient
{
    private $clientId;
    private $clientSecret;
    private $sandbox;
    private $redirectUri;

    public function __construct(string $clientId, string $clientSecret, bool $sandbox, string $redirectUri = '')
    {
        $this->clientId     = $clientId;
        $this->clientSecret = $clientSecret;
        $this->sandbox      = $sandbox;
        $this->redirectUri  = $redirectUri;
    }

    public function authBase(): string
    {
        return $this->sandbox ? 'https://allegro.pl.allegrosandbox.pl' : 'https://allegro.pl';
    }

    public function apiBase(): string
    {
        return $this->sandbox ? 'https://api.allegro.pl.allegrosandbox.pl' : 'https://api.allegro.pl';
    }

    // ---------------------------------------------------------------- OAuth

    /** Adres, na który przekierowujemy użytkownika, by zalogował się w Allegro. */
    public function authorizeUrl(string $state): string
    {
        return $this->authBase() . '/auth/oauth/authorize?' . http_build_query([
            'response_type' => 'code',
            'client_id'     => $this->clientId,
            'redirect_uri'  => $this->redirectUri,
            'state'         => $state,
        ]);
    }

    /** Wymiana kodu autoryzacyjnego na tokeny (po powrocie z Allegro). */
    public function exchangeCode(string $code): array
    {
        return $this->tokenRequest([
            'grant_type'   => 'authorization_code',
            'code'         => $code,
            'redirect_uri' => $this->redirectUri,
        ]);
    }

    /** Odświeżenie access tokenu przy pomocy refresh tokenu. */
    public function refreshToken(string $refreshToken): array
    {
        return $this->tokenRequest([
            'grant_type'    => 'refresh_token',
            'refresh_token' => $refreshToken,
        ]);
    }

    /** Start Device Flow — zwraca user_code i adres do potwierdzenia. */
    public function deviceStart(): array
    {
        return $this->formRequest(
            $this->authBase() . '/auth/oauth/device',
            ['client_id' => $this->clientId]
        );
    }

    /** Odpytanie o token w Device Flow. */
    public function devicePoll(string $deviceCode): array
    {
        return $this->tokenRequest([
            'grant_type'  => 'urn:ietf:params:oauth:grant-type:device_code',
            'device_code' => $deviceCode,
        ]);
    }

    private function tokenRequest(array $params): array
    {
        return $this->formRequest($this->authBase() . '/auth/oauth/token', $params);
    }

    /** POST x-www-form-urlencoded z Basic auth (client_id:client_secret). */
    private function formRequest(string $url, array $params): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query($params),
            CURLOPT_USERPWD        => $this->clientId . ':' . $this->clientSecret,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_TIMEOUT        => 30,
        ]);
        $body = curl_exec($ch);
        $err  = curl_error($ch);
        $http = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        if ($body === false) {
            return ['error' => 'network_error', 'error_description' => $err, 'http' => 0];
        }
        $data = json_decode($body, true);
        if (!is_array($data)) {
            $data = ['error' => 'bad_response', 'error_description' => substr((string)$body, 0, 300)];
        }
        $data['http'] = $http;
        return $data;
    }

    // ------------------------------------------------------------- REST API

    /**
     * Wywołanie REST API. Zwraca ['http' => kod, 'data' => tablica|null, 'raw' => string].
     */
    public function request(string $method, string $path, string $accessToken, $body = null, array $extraHeaders = []): array
    {
        $url = $this->apiBase() . $path;
        $headers = array_merge([
            'Authorization: Bearer ' . $accessToken,
            'Accept: application/vnd.allegro.public.v1+json',
            'Accept-Language: pl-PL',
        ], $extraHeaders);

        $ch = curl_init($url);
        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => strtoupper($method),
            CURLOPT_TIMEOUT        => 60,
        ];
        if ($body !== null) {
            $headers[] = 'Content-Type: application/vnd.allegro.public.v1+json';
            $opts[CURLOPT_POSTFIELDS] = is_string($body)
                ? $body
                : json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        $opts[CURLOPT_HTTPHEADER] = $headers;
        curl_setopt_array($ch, $opts);

        $raw  = curl_exec($ch);
        $err  = curl_error($ch);
        $http = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        if ($raw === false) {
            return ['http' => 0, 'data' => null, 'raw' => '', 'error' => $err];
        }
        return ['http' => $http, 'data' => json_decode($raw, true), 'raw' => (string)$raw];
    }

    /** Zwraca czytelny opis błędu z odpowiedzi API Allegro. */
    public static function apiError(array $resp): string
    {
        if (!empty($resp['error'])) {
            return $resp['error'];
        }
        $d = $resp['data'];
        if (is_array($d)) {
            if (!empty($d['errors']) && is_array($d['errors'])) {
                $msgs = [];
                foreach ($d['errors'] as $e) {
                    $msgs[] = ($e['userMessage'] ?? $e['message'] ?? 'błąd')
                        . (isset($e['path']) ? ' [' . $e['path'] . ']' : '');
                }
                return implode('; ', $msgs);
            }
            if (!empty($d['error_description'])) {
                return $d['error_description'];
            }
            if (!empty($d['message'])) {
                return $d['message'];
            }
        }
        return 'HTTP ' . $resp['http'];
    }
}
