from django.db import models

class MedicalCondition(models.Model):
    name = models.CharField(max_length=255, unique=True, db_index=True)

    def __str__(self):
        return self.name 
    
    class Meta:
        db_table = "MedicalCondition" 
        
        