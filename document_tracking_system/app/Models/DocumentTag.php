<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentTag extends Model
{
    use HasFactory;

    protected $table = "document_tags";

    protected $primaryKey= "document_id";

    public $timestamps = false;
    
    protected $fillable = ['tag_id'];

    public function tag(){
        return $this->belongsTo(Tag::class,"tag_id","tag_id");
    }

    public function document(){
        return $this->belongsTo(Document::class,"document_id","document_id");
    }
}
