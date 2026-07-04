from database.db import Base, engine
from database.models import *

Base.metadata.create_all(bind=engine)

print("Tables Created")