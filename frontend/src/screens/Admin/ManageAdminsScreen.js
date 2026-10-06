import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Text from "../../Components/Text";
import { MaterialIcons } from "@expo/vector-icons";
import Screen from "../../Components/Screen";
import Card from "../../Components/Card";
import Input from "../../Components/Input";
import Button from "../../Components/Button";
import Avatar from "../../Components/Avatar";
import StatusBadge from "../../Components/StatusBadge";
import SectionHeader from "../../Components/SectionHeader";
import LoadingState from "../../Components/LoadingState";
import ConfirmModal from "../../Components/ConfirmModal";
import Alert from "../../Components/Alert";
import api from "../../api/api";
import colors from "../../colors";
import { fonts, radius } from "../../theme";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Super admin only: the owner adds admins (moderators) and removes or restores them.
export default function ManageAdminsScreen({ navigation }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState(null); // admin to remove or restore
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ visible: false, tone: "success", message: "" });

  const showAlert = (tone, text) => setAlert({ visible: true, tone, message: text });

  const fetchAdmins = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/get-admins");
      if (data.success) setAdmins(data.admins);
    } catch (err) {
      showAlert("error", err.response?.data?.message || "Could not load admins");
      console.log("Fetch Admins Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleAdd = async () => {
    if (name.trim().length < 2) return setMessage("Enter the admin's name");
    if (!EMAIL.test(email.trim())) return setMessage("Enter a valid email address");
    if (password.length < 8) return setMessage("The password must be at least 8 characters");

    setAdding(true);
    setMessage("");
    try {
      const { data } = await api.post("/admin/add-admin", { name: name.trim(), email: email.trim(), password });
      if (data.success) {
        setName("");
        setEmail("");
        setPassword("");
        showAlert("success", `${data.admin.email} can now log in as an admin.`);
        fetchAdmins();
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not add the admin");
      console.log("Add Admin Error:", err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleStatus = async () => {
    if (!selected) return;
    const status = selected.status === "active" ? "banned" : "active";
    setSaving(true);
    try {
      const { data } = await api.put(`/admin/update-admin-status/${selected.id}`, { status });
      if (data.success) {
        showAlert("success", data.message);
        fetchAdmins();
      }
    } catch (err) {
      showAlert("error", err.response?.data?.message || "Could not update the admin");
      console.log("Update Admin Error:", err.message);
    } finally {
      setSaving(false);
      setSelected(null);
    }
  };

  return (
    <Screen title="Admins" subtitle="People who help you run Solara" onBack={() => navigation.goBack()}>
      {/* Add admin */}
      <Card>
        <View style={styles.formHeader}>
          <MaterialIcons name="person-add-alt-1" size={22} color={colors.adminGreen} />
          <Text style={styles.formTitle}>Add an admin</Text>
        </View>
        <Text style={styles.formHint}>Admins verify users, review jobs, approve shortlists and handle reports. Only you can add or remove admins.</Text>
        <View style={{ gap: 14, marginTop: 14 }}>
          <Input label="Name" icon="person-outline" placeholder="e.g. Priya" autoCapitalize="words" value={name} onChangeText={setName} />
          <Input label="Email" icon="mail-outline" placeholder="admin@example.com" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Input label="Password" icon="lock-outline" placeholder="At least 8 characters" secure value={password} onChangeText={setPassword} />
          {message ? <Text style={styles.error}>{message}</Text> : null}
          <Button title="Add admin" icon="person-add" onPress={handleAdd} loading={adding} />
        </View>
      </Card>

      {/* Admin list */}
      <SectionHeader title="Admin accounts" style={{ marginTop: 24 }} />
      {loading ? (
        <LoadingState />
      ) : (
        admins.map((admin) => (
          <Card key={admin.id} style={{ marginBottom: 12 }}>
            <View style={styles.row}>
              <Avatar name={admin.name} size={46} color={colors.adminGreen} background={colors.adminGreenSoft} />
              <View style={{ flex: 1 }}>
                <Text translate={false} style={styles.name} numberOfLines={1}>{admin.name}</Text>
                <Text translate={false} style={styles.email} numberOfLines={1}>{admin.email}</Text>
              </View>
              {admin.isSuperAdmin ? (
                <View style={styles.superPill}>
                  <MaterialIcons name="workspace-premium" size={13} color={colors.premiumGold} />
                  <Text style={styles.superText}>Super admin</Text>
                </View>
              ) : (
                <StatusBadge status={admin.status} />
              )}
            </View>
            {!admin.isSuperAdmin ? (
              <Button
                title={admin.status === "active" ? "Remove admin" : "Restore admin"}
                variant={admin.status === "active" ? "danger" : "secondary"}
                size="md"
                onPress={() => setSelected(admin)}
                style={{ marginTop: 12 }}
              />
            ) : null}
          </Card>
        ))
      )}

      <ConfirmModal
        visible={Boolean(selected)}
        title={selected?.status === "active" ? "Remove this admin?" : "Restore this admin?"}
        message={selected?.status === "active" ? "They are signed out at once and can no longer log in." : "They can log in again as an admin."}
        confirmText={selected?.status === "active" ? "Remove" : "Restore"}
        danger={selected?.status === "active"}
        icon={selected?.status === "active" ? "person-remove" : "person-add"}
        loading={saving}
        onConfirm={handleStatus}
        onCancel={() => setSelected(null)}
      />
      <Alert visible={alert.visible} tone={alert.tone} message={alert.message} onClose={() => setAlert((a) => ({ ...a, visible: false }))} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  formHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  formTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.heading },
  formHint: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.muted, marginTop: 6, lineHeight: 19 },
  error: { fontFamily: fonts.medium, color: colors.error, fontSize: 13.5 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.heading },
  email: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, marginTop: 2 },
  superPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.premiumGoldSoft, paddingVertical: 4, paddingHorizontal: 9, borderRadius: radius.pill },
  superText: { fontFamily: fonts.bold, fontSize: 11.5, color: colors.premiumGold },
});
