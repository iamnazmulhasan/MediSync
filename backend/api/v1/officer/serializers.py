from rest_framework import serializers
from apps.personal.models import Officer, Person


class OfficerSerializer(serializers.ModelSerializer):
    # ✅ read/write mapping to Person.name
    person_name = serializers.CharField(source="person.name", required=False)

    # read-only person details
    person_email = serializers.CharField(source="person.email", read_only=True)
    person_mobile = serializers.CharField(source="person.mobile", read_only=True)
    person_nid = serializers.CharField(source="person.nid", read_only=True)

    # allow changing the person by id (optional)
    person = serializers.PrimaryKeyRelatedField(
        queryset=Person.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Officer
        fields = [
            "id",
            "person",
            "person_name",
            "person_email",
            "person_mobile",
            "person_nid",
            "active",
        ]
        read_only_fields = ["id"]

    def update(self, instance, validated_data):
        # because source="person.name"
        person_data = validated_data.pop("person", None)

        # update Officer fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # update Person.name if provided
        if person_data and "name" in person_data and instance.person_id:
            instance.person.name = person_data["name"]
            instance.person.save(update_fields=["name"])

        return instance
    
    