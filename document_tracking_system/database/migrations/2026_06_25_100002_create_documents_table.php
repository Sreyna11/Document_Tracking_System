<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id('document_id');
            $table->string('document_number', 50)->unique();
            $table->string('title', 255);
            $table->text('description')->nullable();
            
            $table->unsignedBigInteger('document_type_id')->nullable();
            $table->foreign('document_type_id')->references('document_type_id')->on('document_types')->nullOnDelete();

            $table->unsignedBigInteger('department_id')->nullable();
            $table->foreign('department_id')->references('department_id')->on('departments')->nullOnDelete();

            $table->unsignedBigInteger('owner_id');
            $table->foreign('owner_id')->references('user_id')->on('users')->restrictOnDelete();

            $table->integer('current_version')->default(1);
            $table->string('status', 30)->default('draft');
            
            $table->text('file_path')->nullable();
            $table->integer('file_size')->nullable();
            $table->string('mime_type', 100)->nullable();
            $table->string('checksum', 64)->nullable();
            
            $table->jsonb('metadata')->nullable();
            
            $table->timestamps();
            $table->timestamp('expires_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
