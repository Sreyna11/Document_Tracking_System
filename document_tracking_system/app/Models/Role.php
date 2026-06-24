<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    use HasFactory;
    protected $table = "roles";
    protected $primaryKey = "role_id";
    public $timestamps = true;
    const UPDATED_AT = null;
    protected $fillable = [
        "role_name",
        "description",
        "permissions",
        "department_id",
        "slug",
        "level",
        "type",
        "core_function",
        "created_at"
    ];

    protected function casts(): array
    {
        return [
            'permissions' => 'array',
        ];
    }

    public function users(){
        return $this->hasMany(User::class, "role_id", "role_id");
    }

    public function department(){
        return $this->belongsTo(Department::class, "department_id", "department_id");
    }
}
