<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    protected $table = "users";

    protected $primaryKey = "user_id";

    public $timestamps = true;

    protected $appends = ['menu_permissions'];

    protected $fillable =[
        "username",
        "email",
        "password_hash",
        "fullname_kh",
        "fullname_en",
        "phone",
        "type",
        "role",
        "profile_photo",
        "signature_photo",
        "department_id",
        "is_active",
        "created_at",
        "updated_at"
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }



    public function assignedRoles()
    {
        return $this->morphToMany(
            config('permission.models.role'),
            'model',
            config('permission.table_names.model_has_roles'),
            config('permission.column_names.model_morph_key'),
            app(\Spatie\Permission\PermissionRegistrar::class)->pivotRole
        );
    }

    public function getMenuPermissionsAttribute()
    {
        $permissions = [];
        $originalTeamId = getPermissionsTeamId();
        setPermissionsTeamId($this->department_id);

        foreach ($this->getAllPermissions() as $permission) {
            $parts = explode(' ', $permission->name, 2);
            if (count($parts) === 2) {
                $action = $parts[0];
                $menu = $parts[1];
                if (!isset($permissions[$menu])) {
                    $permissions[$menu] = [];
                }
                $permissions[$menu][$action] = true;
            }
        }

        setPermissionsTeamId($originalTeamId);
        return $permissions;
    }

    public function department(){
        return $this->belongsTo(Department::class, "department_id", "department_id");
    }

    public function ownedDocuments(){
        return $this->hasMany(Document::class, "owner_id", "user_id");
    }

    public function documentApprovals(){
        return $this->hasMany(DocumentApproval::class, "approver_id", "user_id");
    }

    public function notifications(){
        return $this->hasMany(Notification::class, "user_id", "user_id");
    }

    public function uploadedVersions(){
        return $this->hasMany(DocumentVersion::class, "uploaded_by", "user_id");
    }

    public function documentAccesses(){
        return $this->hasMany(DocumentAccess::class, "user_id", "user_id");
    }

    public function grantedAccesses(){
        return $this->hasMany(DocumentAccess::class, "granted_by", "user_id");
    }

    public function hasPermission(string $menu, string $action): bool
    {
        return $this->hasPermissionTo("$action $menu");
    }

    /**
     * Get the password for the user.
     *
     * @return string
     */
    public function getAuthPassword()
    {
        return $this->password_hash;
    }
}
