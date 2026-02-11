This goes over some miscellaneous URL setups and port forwardings that I have.

The .env file is a quick solution so I could commit stuff here without showing any sensitive information. Feel free to suggest better solutions or setups!

Note: We should probably have an example .env without the actual data that is committed to version control, so we know what values to grab later!

- RaspberryPi address found in .env as raspberryPiAddress
- On xfinity I set the DHCP addresses from (.env xFinityDHCPaddressRange) (something about so that the pi-hole delegates the addresses out)
- on pi hole console I set addresses from (.env piHoleDHCPrange)

Console Sites:
xfinity gateway: .env file as xfinityGatewayAddress
pi hole: .env file as piHOleAddress

In the case that the internet breaks, to undo these things:
- umplug the pi hole raspberry pi
- change the xfinity DCHP address targets back to 2-253

For the VPN Wireguard:
Forwarded port is (.env VPNwireguardForwardedPort)

For immich:
- I am using tailscale on my gaming machine to enter into my network
- I am using digital ocean to rent a VPS server