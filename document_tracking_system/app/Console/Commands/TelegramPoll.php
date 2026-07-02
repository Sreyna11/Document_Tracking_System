<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use App\Http\Controllers\TelegramWebhookController;
use Illuminate\Http\Request;

class TelegramPoll extends Command
{
    protected $signature = 'telegram:poll';
    protected $description = 'Poll Telegram API for new messages (useful for local testing without Ngrok)';

    public function handle(TelegramWebhookController $webhookController)
    {
        $token = env('TELEGRAM_BOT_TOKEN');
        if (empty($token)) {
            $this->error('TELEGRAM_BOT_TOKEN is not set in .env');
            return;
        }

        $this->info("Polling Telegram for updates... Press Ctrl+C to stop.");
        
        // Remove Webhook first, because getUpdates doesn't work if a webhook is set
        Http::get("https://api.telegram.org/bot{$token}/deleteWebhook");

        $offset = 0;

        while (true) {
            try {
                $response = Http::timeout(35)->get("https://api.telegram.org/bot{$token}/getUpdates", [
                    'offset' => $offset,
                    'timeout' => 30
                ]);

                if ($response->successful()) {
                    $updates = $response->json('result');
                    foreach ($updates as $update) {
                        $this->info("Received update ID: " . $update['update_id']);
                        
                        // Fake a request to the Webhook Controller
                        $request = new Request();
                        $request->merge($update);
                        $webhookController->handle($request, app(\App\Services\TelegramService::class));
                        
                        $offset = $update['update_id'] + 1;
                    }
                }
            } catch (\Exception $e) {
                $this->error("Connection error: " . $e->getMessage());
                sleep(2);
            }
        }
    }
}
