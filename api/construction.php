<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db_connect.php';

$action = $_GET['action'] ?? '';

if ($action === 'sites') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $stmt = $pdo->prepare("INSERT INTO construction_sites (name, location, status) VALUES (?, ?, ?)");
        try {
            $stmt->execute([
                $data['name'],
                $data['location'] ?? '',
                $data['status'] ?? 'Active'
            ]);
            $data['id'] = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'data' => $data]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    } else {
        $stmt = $pdo->query("SELECT * FROM construction_sites");
        echo json_encode($stmt->fetchAll());
    }
} elseif ($action === 'expenses') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);

        // Handle project name to site_id conversion if needed
        $site_id = $data['site_id'] ?? null;
        if (!$site_id && !empty($data['project'])) {
            $sStmt = $pdo->prepare("SELECT id FROM construction_sites WHERE name = ?");
            $sStmt->execute([$data['project']]);
            $site = $sStmt->fetch();
            if ($site) {
                $site_id = $site['id'];
            } else {
                $iStmt = $pdo->prepare("INSERT INTO construction_sites (name) VALUES (?)");
                $iStmt->execute([$data['project']]);
                $site_id = $pdo->lastInsertId();
            }
        }

        $stmt = $pdo->prepare("INSERT INTO construction_expenses (site_id, description, amount, date, payment_method, bank_account_id, external_bank_name, external_account_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        try {
            $stmt->execute([
                $site_id,
                $data['description'] ?? $data['desc'] ?? '',
                $data['amount'],
                $data['date'],
                $data['payment_method'] ?? 'cash',
                $data['bank_account_id'] ?? null,
                $data['external_bank_name'] ?? null,
                $data['external_account_number'] ?? null
            ]);
            $data['id'] = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'data' => $data]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    } else {
        $stmt = $pdo->query("SELECT ce.*, cs.name as project FROM construction_expenses ce LEFT JOIN construction_sites cs ON ce.site_id = cs.id ORDER BY ce.date DESC");
        echo json_encode($stmt->fetchAll());
    }
} elseif ($action === 'income') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);

        // Handle project name to site_id conversion if needed
        $site_id = $data['site_id'] ?? null;
        if (!$site_id && !empty($data['project'])) {
            $sStmt = $pdo->prepare("SELECT id FROM construction_sites WHERE name = ?");
            $sStmt->execute([$data['project']]);
            $site = $sStmt->fetch();
            if ($site) {
                $site_id = $site['id'];
            } else {
                $iStmt = $pdo->prepare("INSERT INTO construction_sites (name) VALUES (?)");
                $iStmt->execute([$data['project']]);
                $site_id = $pdo->lastInsertId();
            }
        }

        $stmt = $pdo->prepare("INSERT INTO construction_income (site_id, description, amount, date, payment_method, bank_account_id) VALUES (?, ?, ?, ?, ?, ?)");
        try {
            $stmt->execute([
                $site_id,
                $data['description'] ?? $data['desc'] ?? '',
                $data['amount'],
                $data['date'],
                $data['payment_method'] ?? 'cash',
                $data['bank_account_id'] ?? null
            ]);
            $data['id'] = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'data' => $data]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    } else {
        $stmt = $pdo->query("SELECT ci.*, cs.name as project FROM construction_income ci LEFT JOIN construction_sites cs ON ci.site_id = cs.id ORDER BY ci.date DESC");
        echo json_encode($stmt->fetchAll());
    }
} elseif ($action === 'delete_site') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['id'])) {
            $stmt = $pdo->prepare("DELETE FROM construction_sites WHERE id = ?");
            if ($stmt->execute([$data['id']])) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Delete failed']);
            }
        }
    }
} elseif ($action === 'delete_expense') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['id'])) {
            $stmt = $pdo->prepare("DELETE FROM construction_expenses WHERE id = ?");
            if ($stmt->execute([$data['id']])) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Delete failed']);
            }
        }
    }
} elseif ($action === 'delete_income') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        if (isset($data['id'])) {
            $stmt = $pdo->prepare("DELETE FROM construction_income WHERE id = ?");
            if ($stmt->execute([$data['id']])) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Delete failed']);
            }
        }
    }
} else {
    echo json_encode([]);
}
?>