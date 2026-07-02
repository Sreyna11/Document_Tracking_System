<?php

namespace App\Models;

use Spatie\Permission\Models\Role as SpatieRole;

class Role extends SpatieRole
{
    protected $fillable = [
        "name",
        "description",
        "department_id",
        "slug",
        "level",
        "type",
        "core_function",
        "guard_name"
    ];

    public function department(){
        return $this->belongsTo(Department::class, "department_id", "department_id");
    }
}
