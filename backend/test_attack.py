from services.create_attack import create_attack

attack_id = create_attack(
    technique_id="T1046",
    attack_name="Nmap Scan",
    target_machine="Moksh045"
)

print("Attack ID:", attack_id)