<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class SetTelegramWebhook extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'telegram:set-webhook {url}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Register a webhook URL with Telegram for the bot';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $url = $this->argument('url');
        $token = env('TELEGRAM_BOT_TOKEN');

        if (empty($token)) {
            $this->error('TELEGRAM_BOT_TOKEN is not set in .env');
            return;
        }

        $apiUrl = "https://api.telegram.org/bot{$token}/setWebhook";
        $webhookUrl = rtrim($url, '/') . '/api/telegram/webhook';

        $this->info("Setting webhook to: {$webhookUrl}");

        $response = Http::post($apiUrl, [
            'url' => $webhookUrl
        ]);

        if ($response->successful()) {
            $this->info('Webhook set successfully!');
            $this->line($response->body());
        } else {
            $this->error('Failed to set webhook.');
            $this->line($response->body());
        }
    }
}
