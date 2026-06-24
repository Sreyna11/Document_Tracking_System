<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentApproval extends Model
{
    use HasFactory;

    protected $table = "document_approvals";

    protected $primaryKey = "document_approval_id";
    public $timestamps = false;

    protected $fillable = [

        "document_id",
        "version_number",
        "approver_id",
        "status",
        "comments",
        "approved_at",
        "sequence_order"
    ];

    public function document()
    {
        return $this->belongsTo(Document::class, "document_id", "document_id");
    }

    public function approver()
    {
        return $this->belongsTo(User::class, "approver_id", "user_id");
    }


}
