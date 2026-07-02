<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->string('target_department')->nullable();
            $table->string('sender_name')->nullable();
            $table->string('sender_department')->nullable();
            $table->string('subject')->nullable();
            $table->text('details')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropColumn([
                'target_department',
                'sender_name',
                'sender_department',
                'subject',
                'details'
            ]);
        });
    }
};
