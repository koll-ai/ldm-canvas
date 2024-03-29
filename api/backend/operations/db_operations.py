import os
from unittest import result
import sqlalchemy
import sqlalchemy as db
import traceback
import logging
import datetime

LOCAL_TIMEZONE = datetime.datetime.now(datetime.timezone.utc).astimezone().tzinfo


def connect_unix_socket() -> sqlalchemy.engine.base.Engine:
    db_user = os.environ["DB_USER"]  # e.g. 'my-database-user'
    db_pass = os.environ["DB_PASS"]  # e.g. 'my-database-password'
    db_name = os.environ["DB_NAME"]  # e.g. 'my-database'
    unix_socket_path = os.environ["INSTANCE_UNIX_SOCKET"]  # e.g. '/cloudsql/project:region:instance'

    pool = sqlalchemy.create_engine(
        sqlalchemy.engine.url.URL.create(
            drivername="mysql+pymysql",
            username=db_user,
            password=db_pass,
            database=db_name,
            query={"unix_socket": unix_socket_path},
        )
    )
    return pool

engine = connect_unix_socket()

def get_queue_size():
    table = 'images'
    if type(table) == str:
        table = get_table(table)

    query = db.select(table).where(table.c.status == 'waiting')
    res = engine.execute(query)
    return len([r[0] for r in res])

def insert_to_sql(table, row_to_add):
    if type(table) == str:
        table = get_table(table)
    query = db.insert(table).values(**row_to_add)
    engine.execute(query)


def update_from_sql(table, row_to_update):
    if type(table) == str:
        table = get_table(table)

    query = db.update(table).where(table.c.uuid==row_to_update['uuid']).values(**row_to_update)
    engine.execute(query)

def update_pseudo(email, pseudo):
    users = get_table('users')
    query = db.update(users).where(users.c.email==email).values(dict(pseudo=pseudo))
    engine.execute(query)


def get_table(name):
    return db.Table(name, db.MetaData(), autoload=True, autoload_with=engine)


def get_images_from_room(room):

    images = get_table('images')
    users = get_table('users')
    stmt = db.select(users.c.pseudo,
                     images.c.prompt,
                     images.c.height,
                     images.c.width,
                     images.c.posX,
                     images.c.posY,
                     images.c.timestamp,
                     images.c.status,
                     images.c.path).where(db.or_(users.c.email == images.c.email, images.c.email is None ,images.c.email is None)).where(images.c.room == room).where(images.c.status == 'generated')
    result = engine.execute(stmt)
    result_as_dict = result.mappings().all()
    result_as_dict = [dict(res) for res in result_as_dict]

    return result_as_dict


def check_if_user_exist(email):
    users = get_table('users')
    stmt = db.select(users).where(users.columns.email == email)
    result = engine.execute(stmt)
    res = list(result)
    return len(res) == 1

def get_user_pseudo(email):
    users = get_table('users')
    stmt = db.select(users.c.pseudo).where(users.columns.email == email)
    result = engine.execute(stmt)
    res = list(result)[0][0]
    print(res)
    return res

def user_can_generate(email, sec_interval=2):
    images = get_table('images')
    stmt = db.select(images.c.timestamp).where(images.columns.email == email).order_by(db.desc(images.c.imageID)).limit(1)
    result = engine.execute(stmt)
    res = list(result)
    if len(res) == 0:
        return True
    last_generation = res[0][0]
    print(last_generation)
    current_time_utc = datetime.datetime.now().replace(tzinfo=LOCAL_TIMEZONE).astimezone(tz=datetime.timezone.utc).replace(tzinfo=None)
    print(current_time_utc)
    if last_generation + datetime.timedelta(seconds=sec_interval) < current_time_utc:
        return True
    else:
        return False





