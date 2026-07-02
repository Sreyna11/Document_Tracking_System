<?php

namespace App\Models;

use Illuminate\Cache\HasCacheLock;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasFactory;

    protected $table = "notifications";

    protected $primaryKey = "notification_id";

    public $timestamps = false;

    protected $fillable = [
        "notification_id",
        "user_id",
        "document_id",
        "message",
        "is_read",
        "target_department",
        "sender_name",
        "sender_department",
        "subject",
        "details",
        "created_at"
    ];

    public function user(){
        return $this->belongsTo(User::class, "user_id", "user_id");
    }

    public function document(){
        return $this->belongsTo(Document::class, "document_id", "document_id");
    }
}
