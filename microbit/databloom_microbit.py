# Databloom micro:bit sender (MakeCode Python)
#
# Sends CSV lines over BLE UART (Nordic UART Service):
#   seq,moistureRaw,tempC,lightRaw\n
#
# Pins / sensors:
# - moistureRaw: AnalogPin.P0 (0-1023). Connect soil moisture sensor analog output to P0.
# - tempC: built-in temperature sensor via temperature() (°C, integer)
# - lightRaw: built-in light level via display.read_light_level() (0-255)
#
# Notes:
# - The web app filters for device name starting with "BBC micro:bit" and subscribes to NUS TX.
# - Keep output exactly CSV with a trailing newline. One sample per ~250ms (~4 Hz).
# - Sequence wraps at 65536.

from microbit import *
import bluetooth

SEQ_MOD = 65536
SAMPLE_INTERVAL_MS = 250  # Send samples at ~4 Hz

bluetooth.start_uart_service()

seq = 0

def collect_and_send_data():
    global seq
    # Read sensors
    moisture = pin0.read_analog()                  # 0-1023
    temp_c = temperature()                         # integer °C
    light_val = display.read_light_level()         # 0-255

    # Compose CSV line: seq,moistureRaw,tempC,lightRaw\n
    line = str(seq) + "," + str(moisture) + "," + str(temp_c) + "," + str(light_val)
    bluetooth.uart_write_line(line)

    # Increment sequence (wrap at 16-bit)
    seq = (seq + 1) % SEQ_MOD

    # Send ~4 Hz
    sleep(SAMPLE_INTERVAL_MS)

while True:
    collect_and_send_data()
