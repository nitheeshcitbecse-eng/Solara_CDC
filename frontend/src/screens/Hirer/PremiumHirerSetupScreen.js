import React, { useContext, useRef, useState } from "react";
import SetupLayout from "../../Components/SetupLayout";
import ImagePickerField from "../../Components/ImagePickerField";
import Input from "../../Components/Input";
import PremiumHirerFields from "../../Components/PremiumHirerFields";
import Alert from "../../Components/Alert";
import { AuthContext } from "../../context/AuthContext";
import api from "../../api/api";
import colors from "../../colors";
import { hirerPayload, initHirerForm, validateHirerSection } from "../../lib/premiumForms";
import uploadDocuments from "../../lib/uploadDocuments";
import useImagePreview from "../../lib/useImagePreview";

const STEPS = [
  { key: "organization", title: "Organisation" },
  { key: "contact", title: "Contact & Role" },
  { key: "documents", title: "Documents" },
];

// Premium hirer (hospital, company…) onboarding. Every step is saved, so it resumes where it stopped.
export default function PremiumHirerSetupScreen() {
  const { user, setUser, logout } = useContext(AuthContext);
  const scrollRef = useRef(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => initHirerForm(user));
  const photo = useImagePreview({ max: 1 });
  const aadhaarFront = useImagePreview({ max: 1 });
  const [last4, setLast4] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [completedUser, setCompletedUser] = useState(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const current = STEPS[step];
  const lastStep = step === STEPS.length - 1;

  const goTo = (index) => {
    setMessage("");
    setStep(index);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleNext = async () => {
    const error = validateHirerSection(form, current.key);
    if (error) return setMessage(error);

    setLoading(true);
    setMessage("");
    try {
      const { data } = await api.put("/auth/update-profile", hirerPayload(form));
      if (data.success) {
        setUser(data.user);
        goTo(step + 1);
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not save. Please try again.");
      console.log("Premium Hirer Setup Save Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    if (!photo.images.length && !user.hasPhoto) return setMessage("Please add your photo");
    if (!aadhaarFront.images.length && !user.hasAadhaar) return setMessage("Please add the front of your Aadhaar card");
    if (last4 && !/^\d{4}$/.test(last4)) return setMessage("Enter the last 4 digits of your Aadhaar");

    setLoading(true);
    setMessage("");
    try {
      if (photo.images.length || aadhaarFront.images.length) {
        const uploaded = await uploadDocuments({ photo: photo.images[0], aadhaarFront: aadhaarFront.images[0], last4 });
        if (!uploaded.success) return setMessage(uploaded.message);
        setUser(uploaded.user);
        photo.clearImages();
        aadhaarFront.clearImages();
      }
      const { data } = await api.post("/onboarding/complete");
      if (data.success) {
        setCompletedUser(data.user);
        setAlertMessage("Your organisation is set up. Our team will verify your identity before you can post openings.");
        setAlertVisible(true);
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Upload failed. Please try again.");
      console.log("Premium Hirer Setup Finish Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SetupLayout
        ref={scrollRef}
        title="Set up your organisation"
        subtitle="Professionals see this on every opening you post"
        steps={STEPS.map((item) => item.title)}
        step={step}
        message={message}
        loading={loading}
        onBack={() => goTo(step - 1)}
        onNext={lastStep ? handleFinish : handleNext}
        nextLabel={lastStep ? "Finish" : "Save & Continue"}
        onLogout={logout}
      >
        {current.key !== "documents" ? (
          <PremiumHirerFields form={form} onChange={setForm} section={current.key} />
        ) : (
          <>
            <ImagePickerField label="Your photo *" hint="The person managing hiring" picker={photo} selfie round accent={colors.premiumGold} done={user.hasPhoto} />
            <ImagePickerField label="Your Aadhaar card — front *" hint="Used only to verify you" picker={aadhaarFront} accent={colors.premiumGold} done={user.hasAadhaar} />
            <Input
              label="Last 4 digits of Aadhaar"
              icon="badge"
              placeholder="e.g. 4821"
              keyboardType="number-pad"
              maxLength={4}
              value={last4}
              onChangeText={(text) => setLast4(text.replace(/\D/g, ""))}
              style={{ marginTop: 20 }}
            />
          </>
        )}
      </SetupLayout>

      <Alert
        visible={alertVisible}
        tone="success"
        title="Organisation ready"
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
          if (completedUser) setUser(completedUser);
        }}
      />
    </>
  );
}
