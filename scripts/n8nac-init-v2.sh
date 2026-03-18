#!/bin/bash

# Provide inputs to n8nac init via stdin
(
echo "https://n8n.rapigent.com"
sleep 1
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxODI3NTkyZi0xYzA4LTRkMzktYjcyMi05MDIzN2M1NTUxNDEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNTk5MDBkYmUtNTJiMC00OGQxLWFjZGMtZGRiZDJhOTZkMWZkIiwiaWF0IjoxNzczMzM1MTM2fQ.WSU71IWi9P3QdASvC-J-TbJINqelj6wHA0ZMW3MtQSk"
sleep 1
echo "./workflows"
sleep 1
echo ""  # Select default project
sleep 1
echo ""  # Confirm
sleep 1
) | n8nac init
