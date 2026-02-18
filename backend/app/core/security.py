"""
Enterprise Authentication Module
Provides JWT-based authentication and role-based access control (RBAC)
"""
from datetime import datetime, timedelta
from typing import Optional, List
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from backend.app.core.config import settings

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security scheme
security = HTTPBearer()

# JWT Configuration from settings
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES


# ==================== MODELS ====================

class User(BaseModel):
    """User model"""
    email: EmailStr
    role: str
    hashed_password: str


class LoginRequest(BaseModel):
    """Login request payload"""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Login response with JWT token"""
    access_token: str
    token_type: str
    email: str
    role: str


class TokenData(BaseModel):
    """JWT token payload data"""
    email: str
    role: str
    exp: datetime


# ==================== FAKE USER DATABASE ====================

# In production, this would be a database
# Passwords are hashed using bcrypt
# All users have password: "admin123"

FAKE_USERS_DB = {
    "admin@example.com": User(
        email="admin@example.com",
        role="admin",
        hashed_password=pwd_context.hash("admin123")
    ),
    "ops@example.com": User(
        email="ops@example.com",
        role="operator",
        hashed_password=pwd_context.hash("admin123")
    ),
    "viewer@example.com": User(
        email="viewer@example.com",
        role="viewer",
        hashed_password=pwd_context.hash("admin123")
    ),
}


# ==================== HELPER FUNCTIONS ====================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_user(email: str) -> Optional[User]:
    """Get user from database by email"""
    return FAKE_USERS_DB.get(email)


def authenticate_user(email: str, password: str) -> Optional[User]:
    """Authenticate user with email and password"""
    user = get_user(email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[TokenData]:
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("email")
        role: str = payload.get("role")
        exp: int = payload.get("exp")
        
        if email is None or role is None:
            return None
        
        return TokenData(
            email=email,
            role=role,
            exp=datetime.fromtimestamp(exp)
        )
    except JWTError:
        return None


# ==================== DEPENDENCIES ====================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """
    Dependency to get current authenticated user from JWT token.
    Raises 401 if token is invalid or user not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    token_data = decode_access_token(token)
    
    if token_data is None:
        raise credentials_exception
    
    # Check if token is expired
    if token_data.exp < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = get_user(token_data.email)
    if user is None:
        raise credentials_exception
    
    return user


def require_role(allowed_roles: List[str]):
    """
    Dependency factory to check if user has required role.
    Usage: Depends(require_role(["admin", "operator"]))
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}. Your role: {current_user.role}"
            )
        return current_user
    
    return role_checker


# ==================== AUTH ENDPOINTS ====================

def login(login_data: LoginRequest) -> LoginResponse:
    """
    Authenticate user and return JWT token.
    This function should be called from a FastAPI endpoint.
    """
    user = authenticate_user(login_data.email, login_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token = create_access_token(
        data={"email": user.email, "role": user.role}
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        email=user.email,
        role=user.role
    )


# ==================== ROLE DEFINITIONS ====================

"""
Role Hierarchy and Permissions:

ADMIN:
- Full access to all endpoints
- Can change data mode (POST /api/mode)
- Can trigger simulator scenarios
- Can view all data

OPERATOR:
- Can trigger simulator scenarios
- Can view all data
- Cannot change data mode

VIEWER:
- Read-only access
- Can view all data
- Cannot trigger simulator
- Cannot change modes
"""

ROLE_ADMIN = "admin"
ROLE_OPERATOR = "operator"
ROLE_VIEWER = "viewer"

ALL_ROLES = [ROLE_ADMIN, ROLE_OPERATOR, ROLE_VIEWER]
WRITE_ROLES = [ROLE_ADMIN, ROLE_OPERATOR]
ADMIN_ONLY = [ROLE_ADMIN]
