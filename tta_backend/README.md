# TTA Backend (Django REST API)

This repository contains the **backend API** for the TTA application built using **Django** and **Django REST Framework** with **JWT authentication**.

## Tech Stack

- Python 3.10+
- Django
- Django REST Framework
- Simple JWT
- MySQL

---

## Setup Instructions

### Create Virtual Environment
python -m venv venv
venv\Scripts\activate


---

### Install Dependencies


pip install django djangorestframework djangorestframework-simplejwt mysqlclient or from requirements.txt


---

### Database Configuration (`settings.py`)



DATABASES = {
'default': {
'ENGINE': 'django.db.backends.mysql',
'NAME': 'auth_db',
'USER': 'root',
'PASSWORD': '',
'HOST': 'localhost',
'PORT': '3306',
}
}


➡️ Make sure MySQL is running and database `auth_db` exists.

---

### Run Migrations


python manage.py makemigrations
python manage.py migrate


### Create Superuser


python manage.py createsuperuser


### Run Development Server


python manage.py runserver


Server will start at:


http://127.0.0.1:8000/


---

## Authentication (JWT)

### Register User


POST /api/auth/register/


### Login User


POST /api/auth/login/


Response includes:
- `access` token
- `refresh` token


### Protected APIs
Add this header in Postman:


Authorization: Bearer <ACCESS_TOKEN>


---

## Author 

Kritek Upadhyay