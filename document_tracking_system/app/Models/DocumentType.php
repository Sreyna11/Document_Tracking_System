<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentType extends Model
{
    use HasFactory;
     protected $table = "document_types";

     protected $primaryKey = "document_type_id";
    public $timestamps = true;
     protected $fillable = [
        "name",
        "description",
        "requires_approval",
        "retention_days",
        "status",
        "created_at"
     ];

     public function documents(){
        return $this->hasMany(Document::class, "document_type_id", "document_type_id");
     }
     
}
