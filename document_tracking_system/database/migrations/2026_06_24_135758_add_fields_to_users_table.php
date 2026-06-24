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
        Schema::table('users', function (Blueprint $table) {
            $table->string('fullname_kh')->nullable();
            $table->string('fullname_en')->nullable();
            $table->string('phone')->nullable();
            $table->string('type')->nullable();
            $table->longText('profile_photo')->nullable();
            $table->longText('signature_photo')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['fullname_kh', 'fullname_en', 'phone', 'type', 'profile_photo', 'signature_photo']);
        });
    }
};
