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

const OPEN_STATUSES = ["active", "pending_review"];

export default function CloseJobScreen({ navigation }) {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [closing, setClosing] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (msg) => {
    setAlertMessage(msg);
    setAlertVisible(true);
  };

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const { data } = await api.get("/jobs/get-my-jobs");
        if (data.success) setJobs(data.jobs.filter((job) => OPEN_STATUSES.includes(job.status)));
      } catch (err) {
        showAlert(err.response?.data?.message || "Could not load your jobs");
        console.log("Fetch My Jobs Error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  useEffect(() => {
    const term = search.trim().toLowerCase();
    setFilteredJobs(jobs.filter((job) => job.title.toLowerCase().includes(term) || job.city.toLowerCase().includes(term)));
  }, [search, jobs]);

  const handleClose = async () => {
    setClosing(true);
    try {
      const { data } = await api.put(`/jobs/close-job/${selectedJob.id}`);
      if (data.success) {
        setJobs((current) => current.filter((job) => job.id !== selectedJob.id));
        setSelectedJob(null);
        showAlert(data.message);
      }
    } catch (err) {
      setSelectedJob(null);
      showAlert(err.response?.data?.message || "Something went wrong");
      console.log("Close Job Error:", err.message);
    } finally {
      setClosing(false);
    }
  };

  return (
    <Screen title="Close a Job" subtitle="Stop accepting applications" onBack={() => navigation.goBack()}>
      <SearchBox value={search} onChangeText={setSearch} placeholder="Search open jobs" />

      {loading ? (
        <LoadingState />
      ) : filteredJobs.length === 0 ? (
        <EmptyState icon="work-off" title="No open jobs" message="Jobs you can close will appear here." />
      ) : (
        filteredJobs.map((job) => (
          <JobCard key={job.id} job={job} showStatus>
            <Button title="Close Job" icon="block" variant="danger" size="md" onPress={() => setSelectedJob(job)} style={styles.button} />
          </JobCard>
        ))
      )}

      <ConfirmModal
        visible={Boolean(selectedJob)}
        title="Close this job?"
        message={selectedJob ? `"${selectedJob.title}" will stop accepting applications.` : ""}
        confirmText="Close Job"
        danger
        loading={closing}
        onConfirm={handleClose}
        onCancel={() => setSelectedJob(null)}
      />
      <Alert visible={alertVisible} message={alertMessage} onClose={() => setAlertVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: { marginTop: 12 },
});
