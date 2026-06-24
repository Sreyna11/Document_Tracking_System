<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_approvals', function (Blueprint $table) {
            $table->id('document_approval_id');
            
            $table->unsignedBigInteger('document_id');
            $table->foreign('document_id')->references('document_id')->on('documents')->cascadeOnDelete();
            
            $table->integer('version_number');
            
            $table->unsignedBigInteger('approver_id');
            $table->foreign('approver_id')->references('user_id')->on('users');
            
            $table->string('status', 30)->default('pending');
            $table->text('comments')->nullable();
            $table->timestamp('approved_at')->nullable();
            
            $table->integer('sequence_order');
            
            $table->unique(['document_id', 'version_number', 'approver_id'], 'doc_app_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_approvals');
    }
};
