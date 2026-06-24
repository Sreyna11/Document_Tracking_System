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

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = "users";

    protected $primaryKey = "user_id";

    public $timestamps = true;

    protected $fillable =[
        "username",
        "email",
        "password_hash",
        "fullname_kh",
        "fullname_en",
        "phone",
        "type",
        "profile_photo",
        "signature_photo",
        "department_id",
        "role_id",
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

    public function role(){
        return $this->belongsTo(Role::class, "role_id", "role_id");
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

    /**
     * Check if the user has a specific permission.
     *
     * @param string $menu
     * @param string $action
     * @return bool
     */
    public function hasPermission(string $menu, string $action): bool
    {
        if (!$this->role || !$this->role->permissions) {
            return false;
        }

        $permissions = $this->role->permissions;

        return isset($permissions[$menu][$action]) && $permissions[$menu][$action] === true;
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
