<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Tag extends Model
{
    use HasFactory;

    protected $table = "tags";

    protected $primaryKey = "tag_id";

    public $timestamps = false;

    protected $fillable = [
        "name",
        "created_at",
    ];

    public function documentTag(){
        return $this->belongsToMany(Document::class, "document_tag", "tag_id", "document_id");
    }
}
