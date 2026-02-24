import pandas as pd
import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from PIL import Image, ImageDraw, ImageFont

def generate_pdf(csv_file, output_pdf):
    # 1. Read Data
    df = pd.read_csv(csv_file)
    # Get just the first 30 rows representing recent transactions for clean display
    df_subset = df.head(30)
    
    # 2. Setup PDF Canvas
    doc = SimpleDocTemplate(output_pdf, pagesize=letter)
    elements = []
    
    styles = getSampleStyleSheet()
    title = Paragraph("Recent UPI Transactions Log", styles['Title'])
    elements.append(title)
    elements.append(Spacer(1, 20))
    
    # 3. Create Table Data
    # Column headers
    data = [['Txn ID (Short)', 'Date', 'Sender', 'Receiver', 'Amount (INR)', 'Status']]
    
    for index, row in df_subset.iterrows():
        # Shorten Txn info for PDF space
        short_id = str(row['Transaction ID'])[:8] + "..."
        date = str(row['Timestamp']).split()[0] # Just the date
        data.append([
            short_id,
            date, 
            row['Sender Name'], 
            row['Receiver Name'], 
            f"Rs.{row['Amount (INR)']}", 
            row['Status']
        ])
        
    # 4. Style the Table
    table = Table(data, colWidths=[80, 70, 100, 100, 80, 60])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
    ]))

    # Highlight Failed Transactions in Red (PDF table)
    for row_idx in range(1, len(data)):
        if data[row_idx][5] == "FAILED":
            table.setStyle(TableStyle([('TEXTCOLOR', (5, row_idx), (5, row_idx), colors.red)]))
        else:
            table.setStyle(TableStyle([('TEXTCOLOR', (5, row_idx), (5, row_idx), colors.green)]))

    elements.append(table)
    doc.build(elements)
    print(f"Generated PDF: {output_pdf}")


def generate_image(csv_file, output_img):
    df = pd.read_csv(csv_file)
    # Just grab top 15 for a nice screenshot receipt
    df_subset = df.head(15) 
    
    # Image properties
    width = 1000
    row_height = 40
    header_height = 60
    title_height = 80
    height = title_height + header_height + (len(df_subset) * row_height) + 40
    
    # Create blank canvas
    img = Image.new('RGB', (width, height), color=(240, 244, 248))
    draw = ImageDraw.Draw(img)
    
    try:
        # Try to use a standard arial/helvetica font, fallback to default
        font_title = ImageFont.truetype("arial.ttf", 36)
        font_header = ImageFont.truetype("arial.ttf", 20)
        font_text = ImageFont.truetype("arial.ttf", 16)
        font_bold = ImageFont.truetype("arialbd.ttf", 16)
    except IOError:
        font_title = font_header = font_text = font_bold = ImageFont.load_default()

    # Draw Title
    draw.text((30, 25), "Banking Application: UPI Transfer History", fill=(30, 58, 138), font=font_title)
    
    # Columns positioning
    cols = [
        {"name": "Date", "pos": 30},
        {"name": "Transaction Hash", "pos": 150},
        {"name": "Sender", "pos": 400},
        {"name": "Receiver", "pos": 600},
        {"name": "Amount", "pos": 800},
        {"name": "Status", "pos": 900}
    ]
    
    # Draw Header Background
    y_offset = title_height
    draw.rectangle([0, y_offset, width, y_offset + header_height], fill=(30, 58, 138))
    
    # Draw Header Text
    for col in cols:
        draw.text((col["pos"], y_offset + 18), col["name"], fill=(255, 255, 255), font=font_header)
        
    y_offset += header_height
    
    # Draw Rows
    for index, row in df_subset.iterrows():
        bg_color = (255, 255, 255) if index % 2 == 0 else (226, 232, 240)
        draw.rectangle([0, y_offset, width, y_offset + row_height], fill=bg_color)
        
        # Format text
        date = str(row['Timestamp']).split()[0]
        txn_id = str(row['Transaction ID'])[:15] + "..."
        amt = f"Rs. {row['Amount (INR)']}"
        status = row['Status']
        
        status_color = (220, 38, 38) if status == "FAILED" else (16, 185, 129)
        
        draw.text((cols[0]["pos"], y_offset + 10), date, fill=(71, 85, 105), font=font_text)
        draw.text((cols[1]["pos"], y_offset + 10), txn_id, fill=(100, 116, 139), font=font_text)
        draw.text((cols[2]["pos"], y_offset + 10), str(row['Sender Name']), fill=(15, 23, 42), font=font_bold)
        draw.text((cols[3]["pos"], y_offset + 10), str(row['Receiver Name']), fill=(15, 23, 42), font=font_bold)
        draw.text((cols[4]["pos"], y_offset + 10), amt, fill=(15, 23, 42), font=font_text)
        draw.text((cols[5]["pos"], y_offset + 10), status, fill=status_color, font=font_bold)
        
        y_offset += row_height

    img.save(output_img)
    print(f"Generated Image: {output_img}")


if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(current_dir)
    csv_file = os.path.join(project_dir, "transactions.csv")
    
    pdf_path = os.path.join(project_dir, "upi_transactions.pdf")
    img_path = os.path.join(project_dir, "upi_transactions.png")
    
    if os.path.exists(csv_file):
        generate_pdf(csv_file, pdf_path)
        generate_image(csv_file, img_path)
    else:
        print(f"Error: Could not find {csv_file}")
