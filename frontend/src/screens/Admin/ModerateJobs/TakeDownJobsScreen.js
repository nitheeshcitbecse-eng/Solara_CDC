import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import Screen from "../../../Components/Screen";
import SearchBox from "../../../Components/SearchBox";
import JobCard from "../../../Components/JobCard";
import Button from "../../../Components/Button";
import EmptyState from "../../../Components/EmptyState";
import LoadingState from "../../../Components/LoadingState";
import ConfirmModal from "../../../Components/ConfirmModal";
import Alert from "../../../Components/Alert";
import api from "../../../api/api";

export default function TakeDownJobsScreen({ navigation }) {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [saving, setSaving] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (msg) => {
    setAlertMessage(msg);
    setAlertVisible(true);
  };

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const { data } = await api.get("/admin/get-all-jobs", { params: { status: "active" } });
        if (data.success) setJobs(data.jobs);
      } catch (err) {
        showAlert(err.response?.data?.message || "Could not load jobs");
        console.log("Fetch Active Jobs Error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  useEffect(() => {
    const term = search.trim().toLowerCase();
    setFilteredJobs(jobs.filter((job) => job.title.toLowerCase().includes(term) || (job.hirer.businessName || job.hirer.name).toLowerCase().includes(term)));
  }, [search, jobs]);

  const handleTakeDown = async (reason) => {
    if (reason.length < 5) {
      setSelectedJob(null);
      showAlert("Please give a reason of at least 5 characters.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put(`/admin/take-down-job/${selectedJob.id}`, { reason });
      if (data.success) {
        setJobs((current) => current.filter((job) => job.id !== selectedJob.id));
        setSelectedJob(null);
        showAlert(data.message);
      }
    } catch (err) {
      setSelectedJob(null);
      showAlert(err.response?.data?.message || "Something went wrong");
      console.log("Take Down Job Error:", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Take Down Jobs" subtitle="Active jobs only" onBack={() => navigation.goBack()}>
      <SearchBox value={search} onChangeText={setSearch} placeholder="Search active jobs" />

      {loading ? (
        <LoadingState />
      ) : filteredJobs.length === 0 ? (
        <EmptyState icon="work-off" title="No active jobs found" />
      ) : (
        filteredJobs.map((job) => (
          <JobCard key={job.id} job={job} showTier>
            <Button title="Take Down" icon="remove-circle-outline" variant="danger" size="md" onPress={() => setSelectedJob(job)} style={styles.button} />
          </JobCard>
        ))
      )}

      <ConfirmModal
        visible={Boolean(selectedJob)}
        title="Take down this job?"
        message={selectedJob ? `"${selectedJob.title}" will be hidden from job seekers. The hirer will see your reason.` : ""}
        confirmText="Take Down"
        danger
        loading={saving}
        inputPlaceholder="Reason (at least 5 characters)"
        onConfirm={handleTakeDown}
        onCancel={() => setSelectedJob(null)}
      />
      <Alert visible={alertVisible} message={alertMessage} onClose={() => setAlertVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: { marginTop: 12 },
});
