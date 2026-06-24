<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_access', function (Blueprint $table) {
            $table->id('document_access_id');
            
            $table->unsignedBigInteger('document_id');
            $table->foreign('document_id')->references('document_id')->on('documents')->cascadeOnDelete();
            
            $table->unsignedBigInteger('user_id')->nullable();
            $table->foreign('user_id')->references('user_id')->on('users');
            
            $table->unsignedBigInteger('department_id')->nullable();
            $table->foreign('department_id')->references('department_id')->on('departments');
            
            $table->string('permission_type', 20); // view, edit, approve, download, full
            
            $table->unsignedBigInteger('granted_by')->nullable();
            $table->foreign('granted_by')->references('user_id')->on('users');
            
            $table->timestamp('granted_at')->useCurrent();
            $table->timestamp('expires_at')->nullable();
            
            $table->unique(['document_id', 'user_id', 'permission_type'], 'doc_access_user_perm_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_access');
    }
};
