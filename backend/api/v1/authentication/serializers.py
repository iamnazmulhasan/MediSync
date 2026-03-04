from rest_framework import serializers

class ChangePasswordSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=["person", "laboratory", "pharmacy"])
    id = serializers.IntegerField()
    new_password = serializers.CharField(write_only=True, trim_whitespace=False, min_length=1) 
    
    
class LoginSerializer(serializers.Serializer):
    login = serializers.CharField()     # email or mobile
    password = serializers.CharField()