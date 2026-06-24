<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_versions', function (Blueprint $table) {
            $table->id('document_version_id');
            
            $table->unsignedBigInteger('document_id');
            $table->foreign('document_id')->references('document_id')->on('documents')->cascadeOnDelete();
            
            $table->integer('version_number');
            
            $table->text('file_path');
            $table->integer('file_size')->nullable();
            $table->string('mime_type', 100)->nullable();
            $table->string('checksum', 64)->nullable();
            
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->foreign('uploaded_by')->references('user_id')->on('users')->nullOnDelete();
            
            $table->text('change_summary')->nullable();
            
            $table->timestamp('created_at')->useCurrent();
            
            $table->unique(['document_id', 'version_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_versions');
    }
};
