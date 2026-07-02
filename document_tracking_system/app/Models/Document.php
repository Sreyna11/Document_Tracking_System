<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    use HasFactory;

    protected $table = "documents";
    protected $primaryKey = "document_id";
    public $timestamps = true;
    protected $fillable = [
        "document_number",
        "title",
        "description",
        "document_type_id",
        "department_id",
        "owner_id",
        "current_version",
        "status",
        "file_path",
        "file_size",
        "mime_type",
        "checksum",
        "metadata",
        "created_at",
        "updated_at",
        "expires_at"
    ];

    public function documentVersions()
    {
        return $this->hasMany(DocumentVersion::class, "document_id", "document_id");
    }

    public function documentTag()
    {
        return $this->hasMany(DocumentTag::class, "document_id", "document_id");
    }

    public function documentType()
    {
        return $this->belongsTo(DocumentType::class, "document_type_id", "document_type_id");
    }

    public function department()
    {
        return $this->belongsTo(Department::class, "department_id", "department_id");
    }

    public function owner()
    {
        return $this->belongsTo(User::class, "owner_id", "user_id");
    }

    public function auditlogs()
    {
        return $this->hasMany(AuditLog::class, "document_id", "document_id");
    }

    public function documentAccess()
    {
        return $this->hasMany(DocumentAccess::class, "document_id", "document_id");
    }

    public function documentApproval()
    {
        return $this->hasMany(DocumentApproval::class, "document_id", "document_id");
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class, "document_id", "document_id");
    }

}
