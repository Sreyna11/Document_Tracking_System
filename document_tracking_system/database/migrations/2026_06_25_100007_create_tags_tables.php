<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tags', function (Blueprint $table) {
            $table->id('tag_id');
            $table->string('name', 50)->unique();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('document_tags', function (Blueprint $table) {
            $table->unsignedBigInteger('document_id');
            $table->unsignedBigInteger('tag_id');

            $table->foreign('document_id')->references('document_id')->on('documents')->cascadeOnDelete();
            $table->foreign('tag_id')->references('tag_id')->on('tags')->cascadeOnDelete();

            $table->primary(['document_id', 'tag_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_tags');
        Schema::dropIfExists('tags');
    }
};
