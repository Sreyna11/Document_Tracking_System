<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasFactory;

    protected $table = "audit_logs";

    protected $primaryKey = "audit_log_id";

    public $timestamps = false;

    protected $fillable = [
        "log_id",
        "document_id",
        "action",
        "action_details",
        "ip_address",
        "user_agent",
        "created_at"
    ];

    public function document(){
        return $this->belongsTo(Document::class, "document_id", "document_id");
    }
}
