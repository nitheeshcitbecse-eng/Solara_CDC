import React, { useContext, useRef, useState } from "react";
import SetupLayout from "../../Components/SetupLayout";
import ImagePickerField from "../../Components/ImagePickerField";
import Input from "../../Components/Input";
import PremiumSeekerFields from "../../Components/PremiumSeekerFields";
import Alert from "../../Components/Alert";
import { AuthContext } from "../../context/AuthContext";
import api from "../../api/api";
import colors from "../../colors";
import { initSeekerForm, seekerPayload, validateSeekerSection } from "../../lib/premiumForms";
import uploadDocuments from "../../lib/uploadDocuments";
import useImagePreview from "../../lib/useImagePreview";

const STEPS = [
  { key: "profession", title: "Profession" },
  { key: "experience", title: "Experience" },
  { key: "preferences", title: "Preferences" },
  { key: "documents", title: "Documents" },
];

// Premium (professional) job seeker onboarding. Every step is saved, so it resumes where it stopped.
export default function PremiumSeekerSetupScreen() {
  const { user, setUser, logout } = useContext(AuthContext);
  const scrollRef = useRef(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => initSeekerForm(user));
  const photo = useImagePreview({ max: 1 });
  const aadhaarFront = useImagePreview({ max: 1 });
  const aadhaarBack = useImagePreview({ max: 1 });
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
    const error = validateSeekerSection(form, current.key);
    if (error) return setMessage(error);

    setLoading(true);
    setMessage("");
    try {
      const { data } = await api.put("/auth/update-profile", seekerPayload(form));
      if (data.success) {
        setUser(data.user);
        goTo(step + 1);
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not save. Please try again.");
      console.log("Premium Setup Save Error:", err.message);
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
      if (photo.images.length || aadhaarFront.images.length || aadhaarBack.images.length) {
        const uploaded = await uploadDocuments({
          photo: photo.images[0],
          aadhaarFront: aadhaarFront.images[0],
          aadhaarBack: aadhaarBack.images[0],
          last4,
        });
        if (!uploaded.success) return setMessage(uploaded.message);
        setUser(uploaded.user);
        photo.clearImages();
        aadhaarFront.clearImages();
        aadhaarBack.clearImages();
      }
      const { data } = await api.post("/onboarding/complete");
      if (data.success) {
        setCompletedUser(data.user);
        setAlertMessage("Your professional profile is ready. Verified hospitals and companies can now see your applications.");
        setAlertVisible(true);
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Upload failed. Please try again.");
      console.log("Premium Setup Finish Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SetupLayout
        ref={scrollRef}
        title="Build your professional profile"
        subtitle="Hospitals and companies see this when you apply"
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
          <PremiumSeekerFields form={form} onChange={setForm} section={current.key} />
        ) : (
          <>
            <ImagePickerField label="Your photo *" hint="A clear, professional photo" picker={photo} selfie round accent={colors.premiumGold} done={user.hasPhoto} />
            <ImagePickerField label="Aadhaar card — front *" picker={aadhaarFront} accent={colors.premiumGold} done={user.hasAadhaar} />
            <ImagePickerField label="Aadhaar card — back" hint="Optional" picker={aadhaarBack} accent={colors.premiumGold} />
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
        title="Welcome to Solara Premium"
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
          if (completedUser) setUser(completedUser);
        }}
      />
    </>
  );
}
