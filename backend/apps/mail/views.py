from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from django.core.mail import send_mail


@api_view(["POST"])
def send_test_email(request):
    """
    POST /mail/send-mail/
    body:
    {
      "email": "someone@example.com",
      "message": "Hello!",
      "subject": "Optional subject"
    }
    """
    email = (request.data.get("email") or "").strip()
    message = (request.data.get("message") or "").strip()
    subject = (request.data.get("subject") or "Message from MediSync").strip()

    if not email:
        return Response({"detail": "email is required"}, status=status.HTTP_400_BAD_REQUEST)

    if not message:
        return Response({"detail": "message is required"}, status=status.HTTP_400_BAD_REQUEST)

    # ✅ Always send from the Gmail account you authenticated with
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None) or getattr(settings, "EMAIL_HOST_USER", None)

    if not from_email:
        return Response(
            {"detail": "Email settings missing DEFAULT_FROM_EMAIL / EMAIL_HOST_USER"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    try:
        sent = send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[email],
            fail_silently=False,
        )

        return Response(
            {
                "detail": "Email sent successfully",
                "sent": sent,
                "to": email,
                "from": from_email,
                # ✅ debug to confirm server is using the right settings
                "debug": {
                    "EMAIL_HOST": getattr(settings, "EMAIL_HOST", None),
                    "EMAIL_PORT": getattr(settings, "EMAIL_PORT", None),
                    "EMAIL_USE_SSL": getattr(settings, "EMAIL_USE_SSL", None),
                    "EMAIL_USE_TLS": getattr(settings, "EMAIL_USE_TLS", None),
                    "EMAIL_HOST_USER": getattr(settings, "EMAIL_HOST_USER", None),
                    "PASS_LEN": len(getattr(settings, "EMAIL_HOST_PASSWORD", "") or ""),
                },
            },
            status=status.HTTP_200_OK
        )

    except Exception as e:
        return Response(
            {
                "detail": "Failed to send email",
                "error": str(e),
                "debug": {
                    "EMAIL_HOST": getattr(settings, "EMAIL_HOST", None),
                    "EMAIL_PORT": getattr(settings, "EMAIL_PORT", None),
                    "EMAIL_USE_SSL": getattr(settings, "EMAIL_USE_SSL", None),
                    "EMAIL_USE_TLS": getattr(settings, "EMAIL_USE_TLS", None),
                    "EMAIL_HOST_USER": getattr(settings, "EMAIL_HOST_USER", None),
                    "PASS_LEN": len(getattr(settings, "EMAIL_HOST_PASSWORD", "") or ""),
                    "DEFAULT_FROM_EMAIL": getattr(settings, "DEFAULT_FROM_EMAIL", None),
                },
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )