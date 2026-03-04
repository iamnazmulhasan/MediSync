"""
seed.py
Run:
  python seed.py

This script auto-detects DJANGO_SETTINGS_MODULE by reading manage.py,
so you don't need to hardcode "config.settings".
"""

import os
import re
import random
import string
from decimal import Decimal
from datetime import timedelta, time

# ----------------------------
# 1) Auto-detect settings module from manage.py
# ----------------------------
def detect_settings_module() -> str:
    manage_py = os.path.join(os.path.dirname(__file__), "manage.py")
    if not os.path.exists(manage_py):
        raise RuntimeError("manage.py not found. Put seed.py beside manage.py.")

    txt = open(manage_py, "r", encoding="utf-8").read()
    m = re.search(r"os\.environ\.setdefault\(\s*[\"']DJANGO_SETTINGS_MODULE[\"']\s*,\s*[\"']([^\"']+)[\"']\s*\)", txt)
    if not m:
        raise RuntimeError("Could not detect DJANGO_SETTINGS_MODULE from manage.py")
    return m.group(1)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", detect_settings_module())

import django  # noqa
django.setup()

from django.apps import apps  # noqa
from django.db import transaction  # noqa
from django.utils import timezone  # noqa

# ----------------------------
# CONFIG (tune these numbers)
# ----------------------------
N_DOCTORS = 50
N_PATIENTS = 300
N_LABS = 30
N_PHARMACIES = 30
N_OFFICERS = 10

N_APPOINTMENTS = 1200
MAX_PRESCRIPTIONS_PER_APPT = 1
MAX_MEDICINES_PER_PRESCRIPTION = 6

N_MEDICINES = 200
N_TESTS = 120
LAB_TEST_LINKS_PER_LAB = 40

N_TRANSACTIONS = 1500
N_NOTIFICATIONS = 2000
N_CASHOUTS = 400

RANDOM_SEED = 42
random.seed(RANDOM_SEED)

# ----------------------------
# Helpers
# ----------------------------
def get_model(app_label: str, model_name: str):
    try:
        return apps.get_model(app_label, model_name)
    except LookupError:
        return None

def rand_digits(n=11):
    return "".join(random.choice(string.digits) for _ in range(n))

def rand_email(prefix: str, i: int):
    return f"{prefix}{i}@example.com"

def pick(seq):
    return seq[random.randrange(0, len(seq))]

def safe_get_or_create(model, defaults=None, **kwargs):
    obj = model.objects.filter(**kwargs).first()
    if obj:
        return obj
    params = dict(**kwargs)
    if defaults:
        params.update(defaults)
    return model.objects.create(**params)

@transaction.atomic
def run():
    print("Seeding started...")
    print("Using settings:", os.environ.get("DJANGO_SETTINGS_MODULE"))

    # IMPORTANT: your apps are "apps.<app_name>" so app labels are usually:
    # core, personal, transaction, prescription, business, notification, etc.
    Person = get_model("personal", "Person")
    Doctor = get_model("personal", "Doctor")
    Patient = get_model("personal", "Patient")
    Laboratory = get_model("personal", "Laboratory")
    Pharmacy = get_model("personal", "Pharmacy")
    Officer = get_model("personal", "Officer")

    Appointment = get_model("prescription", "Appointment")
    Prescription = get_model("prescription", "Prescription")
    PrescribedMedicine = get_model("prescription", "PrescribedMedicine")

    StatusCode = get_model("core", "StatusCode")
    UserType = get_model("core", "UserType")

    Transaction = get_model("transaction", "Transaction")
    CashOut = get_model("transaction", "CashOut")

    Notification = get_model("notification", "Notification")

    Medicine = get_model("core", "Medicine")
    Test = get_model("business", "Test") or get_model("core", "Test") or get_model("disease", "Test") or get_model("prescription", "Test")
    LaboratoryTestAvailability = get_model("business", "LaboratoryTestAvailability") or get_model("personal", "LaboratoryTestAvailability")

    if not Person:
        raise RuntimeError("Could not find personal.Person. Check your app label/model name.")

    # ensure StatusCode + UserType exist (won't duplicate)
    if StatusCode:
        for s in ["pending", "accepted", "cancelled"]:
            safe_get_or_create(StatusCode, name=s)
    if UserType:
        for t in ["doctor", "patient", "laboratory", "pharmacy", "officer"]:
            safe_get_or_create(UserType, name=t)

    def make_person(prefix, i):
        return Person.objects.create(
            name=f"{prefix} {i}",
            email=rand_email(prefix.lower(), i),
            mobile=rand_digits(11),
            password="1234",
        )

    print("Creating Persons...")
    doctor_persons = [make_person("Doctor", i) for i in range(1, N_DOCTORS + 1)]
    patient_persons = [make_person("Patient", i) for i in range(1, N_PATIENTS + 1)]
    lab_owner_persons = [make_person("LabOwner", i) for i in range(1, N_LABS + 1)]
    pharmacy_owner_persons = [make_person("PharmacyOwner", i) for i in range(1, N_PHARMACIES + 1)]
    officer_persons = [make_person("Officer", i) for i in range(1, N_OFFICERS + 1)]

    doctors, patients, labs, pharmacies, officers = [], [], [], [], []

    print("Creating Doctors/Patients/Labs/Pharmacies/Officers...")

    if Doctor:
        for p in doctor_persons:
            doctors.append(Doctor.objects.create(
                person=p,
                designation="Specialist",
                location="Dhaka",
                appointment_fee=Decimal(random.choice([300, 500, 800, 1000])),
                daily_patient_limit=random.choice([10, 15, 20, 30]),
                balance=Decimal(random.choice([2000, 5000, 10000, 15000])),
                active=True,
            ))

    if Patient:
        for p in patient_persons:
            patients.append(Patient.objects.create(
                person=p,
                chronic_diseases=random.choice(["", "Diabetes", "Asthma", "Hypertension"]),
                balance=Decimal(random.choice([500, 1000, 2000, 5000])),
                active=True,
            ))

    if Laboratory:
        for i, owner in enumerate(lab_owner_persons, start=1):
            labs.append(Laboratory.objects.create(
                name=f"Lab {i}",
                email=rand_email("lab", i),
                mobile=rand_digits(11),
                owner=owner,
                balance=Decimal(random.choice([5000, 10000, 20000])),
                password="1234",
                active=True,
            ))

    if Pharmacy:
        for i, owner in enumerate(pharmacy_owner_persons, start=1):
            pharmacies.append(Pharmacy.objects.create(
                name=f"Pharmacy {i}",
                email=rand_email("pharmacy", i),
                mobile=rand_digits(11),
                address=f"Road {random.randint(1,50)}, Dhaka",
                owner=owner,
                balance=Decimal(random.choice([3000, 7000, 15000])),
                discount_percentage=Decimal(random.choice([0, 5, 10])),
                password="1234",
                active=True,
            ))

    if Officer:
        for p in officer_persons:
            officers.append(Officer.objects.create(person=p, active=True))

    # Medicines (optional)
    medicines = []
    if Medicine and any(f.name == "name" for f in Medicine._meta.fields):
        print("Creating Medicines...")
        for i in range(1, N_MEDICINES + 1):
            medicines.append(Medicine.objects.create(name=f"Medicine {i}"))

    # Appointments + Prescriptions + PrescribedMedicines (optional)
    if Appointment and Prescription and doctors and patients:
        print("Creating Appointments + Prescriptions + PrescribedMedicines...")
        today = timezone.localdate()
        appts = []
        for _ in range(N_APPOINTMENTS):
            appts.append(Appointment.objects.create(
                patient=pick(patients),
                doctor=pick(doctors),
                appointment_date=today - timedelta(days=random.randint(0, 120)),
                time=time(random.randint(9, 17), random.choice([0, 15, 30, 45])),
                type=random.choice(["Follow-up", "New Patient", "Report Analysis", "General"]),
            ))

        prescriptions = []
        for appt in appts:
            for _ in range(random.randint(1, MAX_PRESCRIPTIONS_PER_APPT)):
                prescriptions.append(Prescription.objects.create(
                    appointment=appt,
                    dx="General diagnosis",
                    cc="Chief complaint text",
                    suggestions="Drink water and rest",
                    next_visit="After 7 days",
                ))

        if PrescribedMedicine and medicines:
            for pr in prescriptions:
                for _ in range(random.randint(1, MAX_MEDICINES_PER_PRESCRIPTION)):
                    PrescribedMedicine.objects.create(
                        prescription=pr,
                        medicine=pick(medicines),
                        uses_process="After meal",
                        duration=random.choice([3, 5, 7, 10, 14]),
                    )

    # Tests + Lab availability (optional)
    tests = []
    if Test and any(f.name == "name" for f in Test._meta.fields):
        print("Creating Tests...")
        for i in range(1, N_TESTS + 1):
            tests.append(Test.objects.create(
                name=f"Test {i}",
                warnings=random.choice(["", "Fasting required", "Avoid caffeine", "Consult physician"])
                if any(f.name == "warnings" for f in Test._meta.fields) else None
            ))

    if LaboratoryTestAvailability and labs and tests:
        print("Creating LaboratoryTestAvailability links...")
        for lab in labs:
            for test in random.sample(tests, k=min(LAB_TEST_LINKS_PER_LAB, len(tests))):
                LaboratoryTestAvailability.objects.get_or_create(
                    lab=lab,
                    test=test,
                    defaults={"price": Decimal(random.randint(300, 2500))},
                )

    # Transactions
    if Transaction and UserType and doctors and patients:
        print("Creating Transactions...")
        doctor_type = UserType.objects.filter(name="doctor").first()
        patient_type = UserType.objects.filter(name="patient").first()
        if doctor_type and patient_type:
            for _ in range(N_TRANSACTIONS):
                p = pick(patients)
                d = pick(doctors)
                Transaction.objects.create(
                    sender_id=p.id,
                    sender_type=patient_type,
                    receiver_id=d.id,
                    receiver_type=doctor_type,
                    transactor_id=p.id,
                    transactor_type=patient_type,
                    amount=Decimal(random.choice([200, 300, 500, 700, 1000])),
                )

    # Notifications
    if Notification and UserType:
        print("Creating Notifications...")
        pools = []
        dt = UserType.objects.filter(name="doctor").first()
        pt = UserType.objects.filter(name="patient").first()
        lt = UserType.objects.filter(name="laboratory").first()
        pht = UserType.objects.filter(name="pharmacy").first()
        ot = UserType.objects.filter(name="officer").first()

        if doctors and dt: pools.append((doctors, dt))
        if patients and pt: pools.append((patients, pt))
        if labs and lt: pools.append((labs, lt))
        if pharmacies and pht: pools.append((pharmacies, pht))
        if officers and ot: pools.append((officers, ot))

        for i in range(N_NOTIFICATIONS):
            objs, utype = pick(pools)
            who = pick(objs)
            Notification.objects.create(
                receiver_id=who.id,
                receiver_type=utype,
                details=f"Notification #{i+1}: sample message",
                is_read=random.choice([False, False, False, True]),
                read_at=timezone.now() if random.choice([False, True]) else None,
            )

    # CashOut
    if CashOut and UserType and StatusCode:
        print("Creating CashOut requests...")
        pending = StatusCode.objects.filter(name="pending").first()
        accepted = StatusCode.objects.filter(name="accepted").first()
        cancelled = StatusCode.objects.filter(name="cancelled").first()
        officer_type = UserType.objects.filter(name="officer").first()

        requester_pools = []
        if doctors: requester_pools.append(("doctor", doctors))
        if patients: requester_pools.append(("patient", patients))
        if labs: requester_pools.append(("laboratory", labs))
        if pharmacies: requester_pools.append(("pharmacy", pharmacies))

        for _ in range(N_CASHOUTS):
            role, objs = pick(requester_pools)
            req_obj = pick(objs)
            req_type = UserType.objects.filter(name=role).first()
            if not req_type:
                continue

            st = random.choices([pending, accepted, cancelled], weights=[70, 20, 10], k=1)[0] or pending

            cash = CashOut.objects.create(
                requester_id=req_obj.id,
                requester_type=req_type,
                amount=Decimal(random.choice([200, 500, 1000, 1500, 2000])),
                status=st,
                note="Seed cashout",
            )

            if st and st.name in ("accepted", "cancelled") and officers and officer_type:
                off = pick(officers)
                cash.officer_id = off.id
                cash.officer_type = officer_type
                cash.processed_at = timezone.now() - timedelta(days=random.randint(0, 30))
                cash.save(update_fields=["officer_id", "officer_type", "processed_at"])

    print("✅ Seeding done!")
    print("Doctors:", Doctor.objects.count() if Doctor else "N/A")
    print("Patients:", Patient.objects.count() if Patient else "N/A")
    print("Labs:", Laboratory.objects.count() if Laboratory else "N/A")
    print("Pharmacies:", Pharmacy.objects.count() if Pharmacy else "N/A")
    print("CashOut:", CashOut.objects.count() if CashOut else "N/A")


if __name__ == "__main__":
    run()