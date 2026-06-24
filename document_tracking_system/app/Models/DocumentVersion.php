<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentVersion extends Model
{
    use HasFactory;

    protected $table = "document_versions";
    
    protected $primaryKey = "document_version_id";

    public $timestamps = false;

    protected $fillable = [
        "document_id",
        "version_number",
        "file_path",
        "file_size",
        "mime_type",
        "checksum",
        "uploaded_by",
        "change_summary",
        "created_at"
    ];

    public function document(){
        return $this->belongsTo(Document::class, "document_id", "document_id");
    }
    
    public function uploader(){
        return $this->belongsTo(User::class, "uploaded_by", "user_id");
    }
}
