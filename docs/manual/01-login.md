# Logging in and roles

## How the system controls access

Every screen in the system sits behind a login. There is no public area apart from the login page itself. Once you log in, the system remembers who you are and what you are allowed to see. Close the browser, come back the next day, and you may still be logged in if "Remember Me" was ticked.

There are three kinds of users in the system. Which kind you are decides what you can do.

- Super Admin. The top of the pile. Can do everything: create and delete users, add and remove vendors, create work orders, approve payments, run reports, manage every dropdown. This role is meant for one or two trusted people only.
- Admin. The day-to-day operator. Can do most things: create vendors, raise work orders, raise payments, run reports, manage REPs. Cannot create or delete other users, and cannot approve their own payments at the highest level.
- REP. A field user. Can only view things relevant to them: trials, work orders, payment status, vendor documents. Cannot change anything.

When this manual says "you can do X", assume Super Admin or Admin unless it says otherwise.

## How to log in with email and password

1. Open the system URL in any modern browser.
2. The login page shows two fields: Email and Password.
3. Type in your email address. Use the same address that was set up for you. The system is not case-sensitive on the email.
4. Type your password. Click the eye icon on the right of the password box if you want to see what you are typing.
5. Tick "Remember Me" if you are on a personal device and want to stay logged in next time. Leave it off on a shared or public computer.
6. Click "Sign In".
7. If the email and password match, the system takes you to the dashboard. If they do not match, a red banner appears at the top of the form. Try again.

## How to log in with OTP

The system can also send a one-time password to your registered mobile number, if you have forgotten your password or if your account is set up for OTP login.

1. On the login page, click the "Login with OTP" link.
2. Type your 10-digit mobile number (no country code, no spaces, no dashes).
3. Click "Send OTP".
4. The system sends a six-digit code to your phone over SMS.
5. Wait up to a minute for the SMS. A countdown timer on the screen tells you when you can ask for a new code if it does not arrive.
6. Type the six-digit code into the box on screen.
7. Click "Verify".
8. If the code matches, you are taken to the dashboard.
9. If the code is wrong or expired, you will see a red message. Use the "Resend OTP" link once the countdown finishes to get a fresh code.

## How to log out

In the top-right corner of every page is your profile circle. Click it. A small menu opens. Click "Logout". You are returned to the login page.

## What happens if I am idle for too long

The system keeps you signed in until the session token expires. If the token expires while you are using the system, the next thing you click will silently refresh it in the background. If even the refresh has expired, you are sent back to the login page and asked to sign in again. Anything you had not saved at that point is lost, so save your work often.

## What happens if I cannot log in

A few common causes, in order of likelihood.

- Wrong email. Make sure there are no typos and no extra spaces.
- Wrong password. Caps lock is the usual culprit. Click the eye icon to confirm.
- Account is new and was never given a password. Ask the Super Admin to set one for you.
- OTP not arriving. Confirm the phone number on file is correct. The SMS sometimes lands a minute or two late on slow networks.

If none of the above works, contact the Super Admin. Passwords cannot be self-reset from the login page in the current version of the system.

## What roles let you see in the sidebar

The sidebar adapts to your role.

- Super Admin sees every menu item: Dashboard, Vendors, Work Orders, Payments, Bank and TDS, REP, Trials, Courier, Reports, Admin.
- Admin sees the same list minus the Admin (User Management) section.
- REP sees a reduced list: Dashboard, Trials they are linked to, related Work Orders and Payments, their assigned Cities.

If you cannot find a menu item the manual mentions, you may simply not have permission to see it. Ask the Super Admin to check your role.
