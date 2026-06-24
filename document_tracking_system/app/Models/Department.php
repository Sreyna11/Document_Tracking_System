<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Department extends Model
{
    use HasFactory;

    protected $table = "departments";
    protected $primaryKey = "department_id";
    public $timestamps = true;
    const UPDATED_AT = null;
    protected $fillable = [
        "name",
        "code",
        "description",
        "campus_suite",
        "user_signature",
        "status",
        "role_permissions",
        "created_at"
    ];

    protected function casts(): array
    {
        return [
            'role_permissions' => 'array',
        ];
    }

    public function users()
    {
        return $this->hasMany(User::class, "department_id", "department_id");
    }

    public function documentAccesses(){
        return $this->hasMany(DocumentAccess::class, "department_id", "department_id");
    }

    public function documents(){
        return $this->hasMany(Document::class, "department_id", "department_id");
    }

    public function roles(){
        return $this->hasMany(Role::class, "department_id", "department_id");
    }
}

