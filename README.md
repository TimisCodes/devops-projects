# Bash Scripting

## 📖 Overview

Bash (Bourne Again SHell) is a Unix/Linux command-line shell and scripting language used to automate repetitive tasks, manage servers, deploy applications, and perform system administration.

Bash scripting is one of the core skills for DevOps Engineers because it enables automation without relying on heavy programming languages.

---

## 🎯 Learning Objectives

- Understand the Linux shell
- Navigate the Linux file system
- Create and execute Bash scripts
- Work with variables
- Accept user input
- Use conditional statements
- Create loops
- Build reusable functions
- Automate Linux administration tasks
- Debug Bash scripts

---

# Topics Covered

## Linux Basics

- File system navigation
- File and directory management
- Permissions
- Ownership
- Users and Groups

---

## Bash Fundamentals

- Shebang (`#!/bin/bash`)
- Comments
- Variables
- Environment variables
- Command substitution
- Exit codes

---

## User Input

- read command
- Positional parameters
- Command-line arguments

Example:

```bash
read -p "Enter your name: " name
echo "Hello $name"
```

---

## Operators

### Arithmetic Operators

- +
- -
- *
- /
- %

### Comparison Operators

- -eq
- -ne
- -gt
- -lt
- -ge
- -le

### String Operators

- =
- !=
- -z
- -n

---

## Conditional Statements

- if
- if-else
- elif
- nested if

Example:

```bash
if [ "$age" -ge 18 ]
then
    echo "Adult"
else
    echo "Minor"
fi
```

---

## Loops

### For Loop

```bash
for i in {1..5}
do
    echo $i
done
```

### While Loop

```bash
count=1

while [ $count -le 5 ]
do
    echo $count
    ((count++))
done
```

---

## Case Statement

```bash
case $choice in
1)
echo "Start"
;;
2)
echo "Stop"
;;
*)
echo "Invalid"
;;
esac
```

---

## Functions

```bash
greet() {
    echo "Welcome to Bash!"
}

greet
```

---

## Useful Commands Learned

### File Management

- pwd
- ls
- cd
- mkdir
- touch
- cp
- mv
- rm

### Viewing Files

- cat
- less
- more
- head
- tail

### Searching

- grep
- find
- locate

### Permissions

- chmod
- chown
- chgrp

### Users & Groups

- useradd
- usermod
- passwd
- groupadd
- groups

### Processes

- ps
- top
- kill
- pkill

### Disk

- df -h
- du -sh
- lsblk

### Memory

- free -m

### Networking

- ping
- curl
- wget
- hostname
- ip

### Archives

- tar
- gzip
- unzip
- zip

---

# Mini Projects

- Interactive Menu Script
- User Creation Script
- Backup Script
- File Organizer
- System Information Script
- Disk Usage Monitor
- Log Cleaner
- Package Update Script
- Process Monitor
- Automated Directory Creator

---

# Skills Gained

- Linux navigation
- Bash scripting
- Automation
- System administration
- Troubleshooting
- File management
- User management
- Shell scripting

---

# DevOps Relevance

Bash scripting is used extensively in DevOps for:

- Server provisioning
- Deployment automation
- CI/CD pipelines
- Infrastructure management
- Monitoring scripts
- Log rotation
- Backup automation
- Cron jobs
- Docker entrypoint scripts
- Kubernetes automation
- AWS CLI automation

---

# Resources

- Bash Documentation
- GNU Bash Manual
- Linux Man Pages

---

# Progress

- [x] Linux Commands
- [x] Variables
- [x] User Input
- [x] Operators
- [x] If Statements
- [x] Loops
- [x] Case Statements
- [x] Functions
- [ ] Advanced Bash
- [ ] Automation Projects

---

# Folder Structure

```
bashscripts/
│
├── README.md
├── notes/
├── scripts/
│   ├── hello.sh
│   ├── calculator.sh
│   ├── menu.sh
│   ├── backup.sh
│   ├── users.sh
│   └── monitor.sh
├── screenshots/
└── projects/
```

---

## Author

**Timilehin Victor**

Learning DevOps & Cloud Engineering through hands-on projects and documenting the journey one technology at a time.
