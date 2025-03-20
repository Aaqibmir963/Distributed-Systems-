#!/bin/bash

# Update the apt package index
sudo apt-get update -y

# Install prerequisite packages. ca-certs are common certificates from
# certification authorities
# gnupg is free version of openpgp. Check certs and decrypt
sudo apt-get install \
    ca-certificates \
    curl \
    gnupg -y

# Download Docker’s official GPG key
#-f is fail fast with no output. i.e. don't return an error page or anything else
#-s silent. Don't show progress meter or error messages
#-S override the -s and show the error but leave the don't show progress meter set by -s
#-L if a response is a reditrection 3xx then call again with the redirection - i.e. follow the redirection if resource has moved 
# pipe it into the new dir at /gpg after --dearmore basically converts from text to binary
sudo mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# source etc/os-release is same as ./etc/os-release i.e. run it. It sets env vars. One is VERSION_CODENAME. Currently nobel
# It sets various others too such as NAME="Ubuntu" VERSION="24.04.1 LTS (Noble Numbat)" etc
# Get the Ubuntu codename from /etc/os-release
source /etc/os-release

# Get the codename - at time of writing nobel
UBUNTU_CODENAME=${VERSION_CODENAME}

# Set up the Docker repository. In this case $(dpkg --print-architecture) evaluates to amd64
# dbkg is the debian package manager
# signed-by set to the digital signature
# download docker nobel stable in this case then add it to the list of packages pointers and signatures
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  ${UBUNTU_CODENAME} stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update the apt package index again with the new docker package added
sudo apt-get update -y

# Can now use apt to install the latest version of Docker Engine, CLI, and containerd
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y

# Start Docker service and enable it to start on boot
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to the Docker group to manage Docker without sudo (optional, log out/in required to take effect)
sudo usermod -aG docker $USER 

# enable me as group
newgrp docker

# Verify Docker installation
docker --version

echo "Docker installation completed successfully."
