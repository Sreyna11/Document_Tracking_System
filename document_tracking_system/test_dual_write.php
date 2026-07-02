<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Department;
use App\Http\Controllers\DocumentController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

// Mock login as user 1
$user = User::first();
Auth::login($user);

$itDept = Department::where('name', 'IT Center')->first() ?? Department::first();
$accDept = Department::where('name', 'Accounting')->first() ?? Department::first();

echo "User: {$user->email}\n";
echo "Sender: {$itDept->name}\n";
echo "Receiver: {$accDept->name}\n";

$data = [
    'id' => 'REQ-' . time(),
    'title' => 'Test Relational ' . time(),
    'details' => 'Testing the dual-write logic.',
    'fromDepartment' => $itDept->name,
    'path' => [
        [
            'department' => $accDept->name,
            'status' => 'Pending',
        ]
    ],
    'files' => [
        [
            'name' => 'testfile.txt',
            'size' => 100,
            'type' => 'text/plain',
            'data' => 'data:text/plain;base64,SGVsbG8gV29ybGQ='
        ]
    ]
];

$request = Request::create('/api/documents', 'POST', [], [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($data));
$controller = new DocumentController();

// 1. Create
$response = $controller->store($request);
$resData = json_decode($response->getContent(), true);

if (!isset($resData['data']['document_id'])) {
    die("Failed to create document\n");
}

$docId = $resData['data']['document_id'];
$docRecord = \App\Models\Document::find($docId);
$docNum = $docRecord->document_number;
echo "Created document: $docId (Number: $docNum)\n";

// Verify tables
$versions = \App\Models\DocumentVersion::where('document_id', $docId)->count();
$access = \App\Models\DocumentAccess::where('document_id', $docId)->count();
$approvals = \App\Models\DocumentApproval::where('document_id', $docId)->count();

echo "Versions created: $versions (Expected: 1)\n";
echo "Access records created: $access (Expected: > 0)\n";
echo "Approval records created: $approvals (Expected: 1)\n";

// 2. Update (Approve and add file)
echo "\n--- Updating document ---\n";
$data['path'][0]['status'] = 'Approved';
$data['path'][0]['comment'] = 'Looks good!';
$data['files'][] = [
    'name' => 'testfile_signed.txt',
    'size' => 120,
    'type' => 'text/plain',
    'data' => 'data:text/plain;base64,SGVsbG8gV29ybGQgLSBTaWduZWQ='
];

$updateRequest = Request::create('/api/documents/'.$docNum, 'PUT', [], [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($data));
$controller->update($updateRequest, $docNum);

$versionsAfter = \App\Models\DocumentVersion::where('document_id', $docId)->count();
$approvalsAfter = \App\Models\DocumentApproval::where('document_id', $docId)->first();

echo "Versions after update: $versionsAfter (Expected: 2)\n";
echo "Approval status after update: {$approvalsAfter->status} (Expected: Approved)\n";
echo "Approval comment after update: {$approvalsAfter->comments} (Expected: Looks good!)\n";
echo "Done testing!\n";
