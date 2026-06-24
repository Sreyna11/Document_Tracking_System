<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentAccess extends Model
{
    use HasFactory;

    protected $table = "document_access";
    protected $primaryKey = "document_access_id";
    public $timestamps = false;
    protected $fillable = [
        "document_id",
        "user_id",
        "department_id",
        "permission_type",
        "granted_by",
        "granted_at",
        "expires_at"
    ];

    public function document(){
        return $this->belongsTo(Document::class, "document_id", "document_id");
    }

    public function user(){
        return $this->belongsTo(User::class, "user_id", "user_id");
    }

    public function department(){
        return $this->belongsTo(Department::class, "department_id", "department_id");
    }

    public function grantedBy(){
        return $this->belongsTo(User::class, "granted_by", "user_id");
    }
}
